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
