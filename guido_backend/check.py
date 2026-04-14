"""
check.py
base version written during the HackHarvard Hackathon 2025
by Rudransh Agrawal, Coleman Hayes

Current version by Hakan Eroglu

Generates audio tours of locations.
"""

from dotenv import load_dotenv
import os
import requests
from google import genai
import tempfile
from gtts import gTTS

load_dotenv()
GENAI_API_KEY = os.getenv("GENAI_API_KEY")

client = genai.Client(api_key=GENAI_API_KEY)


def get_nearby_places(lat, lng, radius=50):
    url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json];
    (
      node["historic"](around:{radius},{lat},{lng});
      node["tourism"](around:{radius},{lat},{lng});
      node["amenity"](around:{radius},{lat},{lng});
      way["historic"](around:{radius},{lat},{lng});
      way["tourism"](around:{radius},{lat},{lng});
      way["amenity"](around:{radius},{lat},{lng});
    );
    out tags;
    """
    try:
        response = requests.get(url, params={"data": query}, timeout=10)
        response.raise_for_status()
        data = response.json()

        places = []
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            name = tags.get("name")
            if name:
                kinds = [k for k in ["historic", "tourism", "amenity"] if k in tags]
                # Avoid duplicates
                if not any(p["name"] == name for p in places):
                    places.append({"name": name, "types": kinds})
        return places[:5]
    except Exception as e:
        print(f"Error fetching from OSM: {e}")
        return []


def describe_places(lat, lng, place_name, language):
    places = get_nearby_places(lat, lng)

    location_context = (
        f"near coordinates ({lat}, {lng}), at {place_name} street or square"
    )

    if not places:
        prompt = f"""
        You are a walking tour narrator. The listener is walking and hearing you through earphones. The user is {location_context}.
        
        There are no mapped historical landmarks within 50 meters of this spot.

        STRICT RULES:
        - NEVER greet the listener. No "Hello", "Hi", "Hey", "Welcome", "Greetings", or ANY salutation. Not even "So" or "Well" or "Now" as opening words.
        - Start mid-sentence as if you've been narrating all along. Example: "You're now passing through..." or "This stretch of road..."
        - This is a CONTINUOUS narration — the listener has been walking and hearing you talk. Each segment should feel like a seamless continuation.
        - Just describe where they are and note what direction to walk to find interesting sites.
        - DO NOT invent or hallucinate ANY specific buildings, statues, or landmarks.
        - NEVER state specific years, dates, seat counts, dimensions, architect names, costs, or any numerical facts. You WILL get them wrong. Only describe in general terms.
        - Keep it to 2-3 sentences max.
        - Respond in {language}.
        """
    else:
        place_info = [
            f"{p.get('name')} ({', '.join(p.get('types', []))})" for p in places
        ]
        prompt = f"""
        You are a walking tour narrator. The listener is walking and hearing you through earphones. They are {location_context}.
        Here are the VERIFIED nearby places (within 50 meters):

        {chr(10).join(place_info)}

        STRICT RULES:
        - NEVER greet the listener. No "Hello", "Hi", "Hey", "Welcome", "Greetings", or ANY salutation. Not even "So" or "Well" or "Now" as opening words.
        - Start mid-sentence as if you've been narrating all along. Example: "Just ahead is..." or "On your right you'll notice..."
        - This is a CONTINUOUS narration — each segment should feel like a seamless continuation of an ongoing tour.
        - Only describe the verified places listed above by their name and general purpose/type.
        - CRITICAL: DO NOT invent or hallucinate ANY places not in the list.
        - NEVER state specific years, dates, opening years, seat counts, square footage, architect names, costs, or any numerical facts. You WILL get them wrong. Describe only in general terms (e.g. "a performing arts center" not "a 500-seat theater completed in 2007").
        - Use spatial language like "nearby", "just ahead", "right around here".
        - Keep it factual, engaging, 4 sentences max.
        - No storytelling, no fluff.
        - Respond in {language}.
        """

    response = client.models.generate_content(model="gemma-3-27b-it", contents=prompt)
    return response.text


def speech(msg):
    print("Tour Guide generating TTS...")
    
    # We use tld="com.au" to give it a slightly fun Australian accent. 
    # Unfortunately gTTS does not natively support pitching down or speeding up.
    tts = gTTS(text=msg, lang="en", tld="com.au")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
        output_file = f.name

    tts.save(output_file)

    return output_file


def generate_audio_for_location(lat, lng, place_name, language="English"):
    description = describe_places(lat, lng, place_name, language)
    audio_file_path = speech(description)

    return audio_file_path, description


# How do I plug in the language to the describe_places function?
# Still need to define the get_language function and uncomment
# the language variable in the describe_places function
