import { reverseGeocode } from "./utils";

export async function getData(coords: { lat: number; lng: number }, language: string){
	const apilink = "https://theroamerbackend.onrender.com/audio";

	const imageUrl =
		"https://www.tclf.org/sites/default/files/thumbnails/image/HarvardUniversity-sig.jpg";

	const placeName = await reverseGeocode(coords);

	console.log("API Request - Sending coordinates:", {
		latitude: coords.lat,
		longitude: coords.lng,
		placeName,
		language,
	});
	const url = `${apilink}`;

	const res = await fetch(url, {
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
		throw new Error(`API responded with status ${res.status}: ${errorText}`);
	}

	const jsonResponse = await res.json();
	console.log("API Response - Received JSON:", jsonResponse);

	const base64Audio = jsonResponse.audio;
	const transcript = jsonResponse.transcript;

	const audioBlob = base64ToBlob(base64Audio, 'audio/mpeg');
	console.log("Converted base64 to audio blob, size:", audioBlob.size, "bytes");
	
	const voiceUrl = URL.createObjectURL(audioBlob);

	return {
		imageUrl,
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
