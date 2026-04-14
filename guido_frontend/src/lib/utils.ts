export async function reverseGeocode({
	lat,
	lng,
}: {
	lat: number;
	lng: number;
}): Promise<string> {
	try {
		const url = new URL("https://nominatim.openstreetmap.org/reverse");
		url.searchParams.set("format", "jsonv2");
		url.searchParams.set("lat", String(lat));
		url.searchParams.set("lon", String(lng));
		url.searchParams.set("zoom", "16");
		const res = await fetch(url, {
			headers: { "User-Agent": "tour-guide-demo/1.0 (student)" },
		});
		const data = await res.json();
		return data.display_name || "Unknown place";
	} catch {
		return "Unknown place";
	}
}

export function haversineDistance(
	coords1: { lat: number; lng: number },
	coords2: { lat: number; lng: number }
): number {
	const R = 6371; // Radius of the Earth in km
	const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
	const dLng = (coords2.lng - coords1.lng) * (Math.PI / 180);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(coords1.lat * (Math.PI / 180)) *
			Math.cos(coords2.lat * (Math.PI / 180)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c; // Distance in km
}
