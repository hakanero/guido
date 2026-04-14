from flask import Flask, request, send_file, jsonify, g
from flask_cors import CORS
import os
from dotenv import load_dotenv
import check
import base64
from db import init_db, query, query_with_columns
from auth import (
    hash_password,
    check_password,
    create_token,
    login_required,
)

load_dotenv()

app = Flask(__name__)

CORS(app)

# Initialize database tables on startup
try:
    init_db()
except Exception as e:
    print(f"Warning: Could not initialize database: {e}")
    print("Auth and location features will not work until DATABASE_URL is configured.")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------
@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing request body"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    display_name = (data.get("display_name") or "").strip()

    if not email or not password or not display_name:
        return jsonify({"error": "Email, password, and display name are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # Check if user already exists
    existing = query(
        "SELECT id FROM users WHERE email = %s", (email,), fetchone=True
    )
    if existing:
        return jsonify({"error": "An account with this email already exists"}), 409

    pw_hash = hash_password(password)
    row = query(
        "INSERT INTO users (email, password_hash, display_name) VALUES (%s, %s, %s) RETURNING id",
        (email, pw_hash, display_name),
        fetchone=True,
    )
    user_id = row[0]

    # Create a session
    session_row = query(
        "INSERT INTO sessions (user_id) VALUES (%s) RETURNING id",
        (user_id,),
        fetchone=True,
    )

    token = create_token(user_id, email)
    return jsonify({
        "token": token,
        "session_id": session_row[0],
        "user": {
            "id": user_id,
            "email": email,
            "display_name": display_name,
        },
    }), 201


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing request body"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = query_with_columns(
        "SELECT id, email, password_hash, display_name FROM users WHERE email = %s",
        (email,),
        fetchone=True,
    )
    if not user or not check_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    # End any open sessions for this user
    query(
        "UPDATE sessions SET ended_at = NOW() WHERE user_id = %s AND ended_at IS NULL",
        (user["id"],),
    )

    # Create a new session
    session_row = query(
        "INSERT INTO sessions (user_id) VALUES (%s) RETURNING id",
        (user["id"],),
        fetchone=True,
    )

    token = create_token(user["id"], user["email"])
    return jsonify({
        "token": token,
        "session_id": session_row[0],
        "user": {
            "id": user["id"],
            "email": user["email"],
            "display_name": user["display_name"],
        },
    }), 200


@app.route("/auth/logout", methods=["POST"])
@login_required
def logout():
    # End the user's current open session
    query(
        "UPDATE sessions SET ended_at = NOW() WHERE user_id = %s AND ended_at IS NULL",
        (g.user_id,),
    )
    return jsonify({"message": "Logged out"}), 200


@app.route("/auth/me", methods=["GET"])
@login_required
def me():
    user = query_with_columns(
        "SELECT id, email, display_name, created_at FROM users WHERE id = %s",
        (g.user_id,),
        fetchone=True,
    )
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Get current active session
    session = query_with_columns(
        "SELECT id, started_at FROM sessions WHERE user_id = %s AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
        (g.user_id,),
        fetchone=True,
    )

    user["created_at"] = user["created_at"].isoformat() if user.get("created_at") else None
    result = {**user}
    if session:
        result["session_id"] = session["id"]
        result["session_started_at"] = session["started_at"].isoformat() if session.get("started_at") else None

    return jsonify(result), 200


# ---------------------------------------------------------------------------
# Location tracking
# ---------------------------------------------------------------------------
@app.route("/location", methods=["POST"])
@login_required
def save_location():
    data = request.get_json()
    if not data or "latitude" not in data or "longitude" not in data:
        return jsonify({"error": "Missing latitude or longitude"}), 400

    lat = float(data["latitude"])
    lng = float(data["longitude"])
    place_name = data.get("place_name", "")
    session_id = data.get("session_id")

    if not session_id:
        # Find the user's current open session
        session = query(
            "SELECT id FROM sessions WHERE user_id = %s AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
            (g.user_id,),
            fetchone=True,
        )
        if session:
            session_id = session[0]
        else:
            # Create a new session
            session = query(
                "INSERT INTO sessions (user_id) VALUES (%s) RETURNING id",
                (g.user_id,),
                fetchone=True,
            )
            session_id = session[0]

    query(
        "INSERT INTO location_history (session_id, user_id, latitude, longitude, place_name) VALUES (%s, %s, %s, %s, %s)",
        (session_id, g.user_id, lat, lng, place_name),
    )

    return jsonify({"message": "Location saved"}), 201


@app.route("/location/history", methods=["GET"])
@login_required
def get_history():
    sessions = query_with_columns(
        """
        SELECT s.id, s.started_at, s.ended_at,
               COUNT(lh.id) as point_count
        FROM sessions s
        LEFT JOIN location_history lh ON lh.session_id = s.id
        WHERE s.user_id = %s
        GROUP BY s.id
        ORDER BY s.started_at DESC
        """,
        (g.user_id,),
    )

    for s in sessions:
        s["started_at"] = s["started_at"].isoformat() if s.get("started_at") else None
        s["ended_at"] = s["ended_at"].isoformat() if s.get("ended_at") else None

    return jsonify(sessions), 200


@app.route("/location/session/<int:session_id>", methods=["GET"])
@login_required
def get_session_detail(session_id):
    # Verify the session belongs to the user
    session = query_with_columns(
        "SELECT id, started_at, ended_at FROM sessions WHERE id = %s AND user_id = %s",
        (session_id, g.user_id),
        fetchone=True,
    )
    if not session:
        return jsonify({"error": "Session not found"}), 404

    points = query_with_columns(
        "SELECT latitude, longitude, place_name, recorded_at FROM location_history WHERE session_id = %s ORDER BY recorded_at ASC",
        (session_id,),
    )

    for p in points:
        p["recorded_at"] = p["recorded_at"].isoformat() if p.get("recorded_at") else None

    session["started_at"] = session["started_at"].isoformat() if session.get("started_at") else None
    session["ended_at"] = session["ended_at"].isoformat() if session.get("ended_at") else None

    return jsonify({"session": session, "points": points}), 200


# ---------------------------------------------------------------------------
# Audio tour (existing — now with optional auth for usage tracking)
# ---------------------------------------------------------------------------
@app.route("/audio", methods=["POST"])
def generate_audio():
    try:
        data = request.get_json()

        if (
            not data
            or "latitude" not in data
            or "longitude" not in data
            or "place_name" not in data
        ):
            return jsonify({"error": "Missing latitude, longitude, or place_name"}), 400

        lat = float(data["latitude"])
        lng = float(data["longitude"])
        place_name = data["place_name"]
        language = data.get("language", "English")

        if not place_name or not place_name.strip():
            return jsonify({"error": "place_name cannot be empty"}), 400

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400

        location_display = f"{place_name} ({lat}, {lng})"
        print(f"Generating audio for {location_display} in {language}")

        audio_path, transcript = check.generate_audio_for_location(
            lat, lng, place_name, language
        )

        try:
            with open(audio_path, "rb") as audio_file:
                audio_data = base64.b64encode(audio_file.read()).decode("utf-8")

            return jsonify(
                {"transcript": transcript, "audio": audio_data, "audioFormat": "mp3"}
            ), 200
        finally:
            try:
                if os.path.exists(audio_path):
                    os.unlink(audio_path)
            except Exception as cleanup_error:
                print(
                    f"Warning: Failed to cleanup temp file {audio_path}: {cleanup_error}"
                )

    except ValueError:
        return jsonify({"error": "Invalid latitude or longitude format"}), 400
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/audio", methods=["GET"])
def generate_audio_get():
    try:
        lat = request.args.get("latitude")
        lng = request.args.get("longitude")
        place_name = request.args.get("place_name")
        language = request.args.get("language", "English")

        if not lat or not lng or not place_name:
            return jsonify({"error": "Missing latitude, longitude, or place_name"}), 400

        if not place_name.strip():
            return jsonify({"error": "place_name cannot be empty"}), 400

        lat = float(lat)
        lng = float(lng)

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return jsonify({"error": "Invalid coordinates"}), 400

        location_display = f"{place_name} ({lat}, {lng})"
        print(f"Generating audio for {location_display} in {language}")

        audio_path, transcript = check.generate_audio_for_location(
            lat, lng, place_name, language
        )

        try:
            with open(audio_path, "rb") as audio_file:
                audio_data = base64.b64encode(audio_file.read()).decode("utf-8")

            return jsonify(
                {"transcript": transcript, "audio": audio_data, "audioFormat": "mp3"}
            ), 200
        finally:
            try:
                if os.path.exists(audio_path):
                    os.unlink(audio_path)
            except Exception as cleanup_error:
                print(
                    f"Warning: Failed to cleanup temp file {audio_path}: {cleanup_error}"
                )

    except ValueError:
        return jsonify({"error": "Invalid latitude or longitude format"}), 400
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)
