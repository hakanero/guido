const API_BASE = import.meta.env.VITE_BACKEND_URL
	? import.meta.env.VITE_BACKEND_URL.replace(/\/$/, "")
	: "http://localhost:8080";

function getToken(): string | null {
	return localStorage.getItem("guido_token");
}

function getSessionId(): number | null {
	const id = localStorage.getItem("guido_session_id");
	return id ? parseInt(id, 10) : null;
}

function authHeaders(): Record<string, string> {
	const token = getToken();
	if (!token) return {};
	return { Authorization: `Bearer ${token}` };
}

async function safeJson(res: Response) {
	const text = await res.text();
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(
			res.ok
				? "Server returned invalid response"
				: `Server error (${res.status}): auth endpoint not available`
		);
	}
}

// ---- Auth API ----

export async function apiRegister(
	email: string,
	password: string,
	displayName: string
) {
	const res = await fetch(`${API_BASE}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email,
			password,
			display_name: displayName,
		}),
	});
	const data = await safeJson(res);
	if (!res.ok) throw new Error(data?.error || "Registration failed");
	localStorage.setItem("guido_token", data.token);
	localStorage.setItem("guido_session_id", String(data.session_id));
	return data;
}

export async function apiLogin(email: string, password: string) {
	const res = await fetch(`${API_BASE}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	const data = await safeJson(res);
	if (!res.ok) throw new Error(data?.error || "Login failed");
	localStorage.setItem("guido_token", data.token);
	localStorage.setItem("guido_session_id", String(data.session_id));
	return data;
}

export async function apiLogout() {
	const token = getToken();
	if (token) {
		try {
			await fetch(`${API_BASE}/auth/logout`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...authHeaders(),
				},
			});
		} catch {
			// Logout is best-effort
		}
	}
	localStorage.removeItem("guido_token");
	localStorage.removeItem("guido_session_id");
}

export async function apiGetMe() {
	const res = await fetch(`${API_BASE}/auth/me`, {
		headers: authHeaders(),
	});
	if (!res.ok) return null;
	return safeJson(res);
}

// ---- Location tracking API ----

export async function apiSaveLocation(
	lat: number,
	lng: number,
	placeName?: string
) {
	const token = getToken();
	if (!token) return;

	const sessionId = getSessionId();
	await fetch(`${API_BASE}/location`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...authHeaders(),
		},
		body: JSON.stringify({
			latitude: lat,
			longitude: lng,
			place_name: placeName || "",
			session_id: sessionId,
		}),
	});
}

export async function apiGetHistory() {
	const res = await fetch(`${API_BASE}/location/history`, {
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error("Failed to fetch history");
	return res.json();
}

export async function apiGetSessionDetail(sessionId: number) {
	const res = await fetch(`${API_BASE}/location/session/${sessionId}`, {
		headers: authHeaders(),
	});
	if (!res.ok) throw new Error("Failed to fetch session");
	return res.json();
}

// ---- Audio API (existing, unchanged) ----

import { reverseGeocode } from "./utils";

export async function getData(
	coords: { lat: number; lng: number },
	language: string
) {
	const apilink = `${API_BASE}/audio`;

	const placeName = await reverseGeocode(coords);

	console.log("API Request - Sending coordinates:", {
		latitude: coords.lat,
		longitude: coords.lng,
		placeName,
		language,
	});

	const res = await fetch(apilink, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			latitude: coords.lat,
			longitude: coords.lng,
			place_name: placeName,
			language: language,
		}),
	});

	console.log("API Response status:", res.status);
	if (!res.ok) {
		const errorText = await res.text();
		console.error("API Error Response:", errorText);
		throw new Error(
			`API responded with status ${res.status}: ${errorText}`
		);
	}

	const jsonResponse = await res.json();
	console.log("API Response - Received JSON:", jsonResponse);

	const base64Audio = jsonResponse.audio;
	const transcript = jsonResponse.transcript;

	const audioBlob = base64ToBlob(base64Audio, "audio/mpeg");
	console.log(
		"Converted base64 to audio blob, size:",
		audioBlob.size,
		"bytes"
	);

	const voiceUrl = URL.createObjectURL(audioBlob);

	return {
		voiceUrl,
		transcript,
	};
}

function base64ToBlob(base64: string, mimeType: string): Blob {
	const byteCharacters = atob(base64);
	const byteNumbers = new Array(byteCharacters.length);
	for (let i = 0; i < byteCharacters.length; i++) {
		byteNumbers[i] = byteCharacters.charCodeAt(i);
	}
	const byteArray = new Uint8Array(byteNumbers);
	return new Blob([byteArray], { type: mimeType });
}
