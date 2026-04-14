import { useEffect, useState, useRef } from "react";
import { reverseGeocode } from "../lib/utils";

async function ipFallbackLocation(): Promise<{ lat: number; lng: number } | null> {
	try {
		const res = await fetch("https://ipapi.co/json/");
		if (!res.ok) return null;
		const data = await res.json();
		if (data.latitude && data.longitude) {
			return { lat: data.latitude, lng: data.longitude };
		}
		return null;
	} catch {
		return null;
	}
}

export function useLocation(timeout = 15000): {
	coords: { lat: number; lng: number };
	placeName?: string;
	locationError?: string;
} {
	const [location, setLocation] = useState<{
		coords: { lat: number; lng: number };
		placeName?: string;
	} | null>(null);
	const [locationError, setLocationError] = useState<string | undefined>(undefined);
	const retryCount = useRef(0);
	const hasSucceeded = useRef(false);
	const triedIpFallback = useRef(false);
	const isGeocoding = useRef(false);
	const lastGeocodedCoords = useRef<{ lat: number; lng: number } | null>(null);

	useEffect(() => {
		if (!navigator.geolocation) {
			setLocationError("Geolocation is not supported by your browser");
			return;
		}

		const onSuccess = (position: GeolocationPosition) => {
			const lat = position.coords.latitude;
			const lng = position.coords.longitude;

			hasSucceeded.current = true;
			retryCount.current = 0;
			setLocationError(undefined);

			// Always update coords immediately (no async blocking)
			setLocation((prev) => ({
				coords: { lat, lng },
				placeName: prev?.placeName || "Loading...",
			}));

			// Only reverse-geocode if we haven't recently and aren't already doing it
			const lastGeo = lastGeocodedCoords.current;
			const needsGeocode =
				!lastGeo ||
				Math.abs(lastGeo.lat - lat) > 0.0005 ||
				Math.abs(lastGeo.lng - lng) > 0.0005;

			if (needsGeocode && !isGeocoding.current) {
				isGeocoding.current = true;
				lastGeocodedCoords.current = { lat, lng };
				reverseGeocode({ lat, lng })
					.then((name) => {
						setLocation((prev) =>
							prev
								? { ...prev, placeName: name.split(",")[0] || "Unknown place" }
								: { coords: { lat, lng }, placeName: name.split(",")[0] || "Unknown place" }
						);
					})
					.catch(() => {
						// Geocoding failed — keep existing placeName
					})
					.finally(() => {
						isGeocoding.current = false;
					});
			}
		};

		const tryIpFallback = async () => {
			if (triedIpFallback.current) return;
			triedIpFallback.current = true;
			const ipLocation = await ipFallbackLocation();
			if (ipLocation && !hasSucceeded.current) {
				setLocationError("Using approximate location (GPS unavailable)");
				setLocation({
					coords: ipLocation,
					placeName: "Loading...",
				});
				reverseGeocode(ipLocation)
					.then((name) => {
						setLocation((prev) =>
							prev
								? { ...prev, placeName: name.split(",")[0] || "Unknown place" }
								: { coords: ipLocation, placeName: name.split(",")[0] || "Unknown place" }
						);
					})
					.catch(() => {});
			}
		};

		const onError = (error: GeolocationPositionError) => {
			console.error("Location error:", error.code, error.message);

			// Retry on transient errors
			if (
				!hasSucceeded.current &&
				retryCount.current < 3 &&
				error.code !== error.PERMISSION_DENIED
			) {
				retryCount.current++;
				console.log(`Location retry ${retryCount.current}/3...`);
				setTimeout(() => {
					navigator.geolocation.getCurrentPosition(onSuccess, onError, {
						enableHighAccuracy: false, // Try without high accuracy
						timeout: timeout + retryCount.current * 5000,
						maximumAge: 60000,
					});
				}, 2000);
				return;
			}

			// All retries failed — use IP fallback
			if (!hasSucceeded.current) {
				tryIpFallback();
			}

			if (error.code === error.PERMISSION_DENIED) {
				setLocationError("Location access denied. Please enable location services.");
			} else if (!hasSucceeded.current && triedIpFallback.current) {
				setLocationError("Using approximate location (GPS unavailable)");
			}
		};

		// Initial position request — accept cached
		navigator.geolocation.getCurrentPosition(onSuccess, onError, {
			enableHighAccuracy: true,
			timeout: timeout,
			maximumAge: 60000,
		});

		// Continuous updates — use watchPosition
		const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
			enableHighAccuracy: true,
			timeout: timeout,
			maximumAge: 30000,
		});

		return () => navigator.geolocation.clearWatch(watchId);
	}, [timeout]);

	return (
		location
			? { ...location, locationError }
			: {
					coords: { lat: 42.3736, lng: -71.1097 },
					placeName: "Harvard Yard",
					locationError,
				}
	);
}
