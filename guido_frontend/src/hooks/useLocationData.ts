import { useEffect, useState, useRef } from "react";
import { reverseGeocode } from "../lib/utils";

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

	useEffect(() => {
		if (!navigator.geolocation) {
			console.error("Geolocation is not supported by your browser");
			setLocationError("Geolocation is not supported by your browser");
			return;
		}

		const onSuccess = async (position: GeolocationPosition) => {
			hasSucceeded.current = true;
			retryCount.current = 0;
			setLocationError(undefined);
			setLocation({
				coords: {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				},
				placeName:
					(
						await reverseGeocode({
							lat: position.coords.latitude,
							lng: position.coords.longitude,
						})
					).split(",")[0] || "Unknown place",
			});
		};

		const onError = (error: GeolocationPositionError) => {
			console.error("Error getting location:", error);

			// On transient errors, retry up to 3 times with increasing timeout
			if (
				!hasSucceeded.current &&
				retryCount.current < 3 &&
				error.code !== error.PERMISSION_DENIED
			) {
				retryCount.current++;
				console.log(`Location retry ${retryCount.current}/3...`);
				setTimeout(() => {
					navigator.geolocation.getCurrentPosition(
						onSuccess,
						onError,
						{ enableHighAccuracy: true, timeout: timeout + retryCount.current * 5000, maximumAge: 30000 }
					);
				}, 2000);
				return;
			}

			if (error.code === error.PERMISSION_DENIED) {
				setLocationError("Location access denied. Please enable location services.");
			} else if (error.code === error.POSITION_UNAVAILABLE) {
				setLocationError("Location unavailable. Check Settings → Privacy → Location Services.");
			} else if (error.code === error.TIMEOUT) {
				setLocationError("Location request timed out. Try reloading the page.");
			} else {
				setLocationError("Could not determine your location.");
			}
		};

		// First attempt: accept cached positions up to 30s old (helps on wake from sleep)
		navigator.geolocation.getCurrentPosition(onSuccess, onError, {
			enableHighAccuracy: true,
			timeout: timeout,
			maximumAge: 30000,
		});

		// Also use watchPosition for continuous updates (more reliable than polling)
		const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
			enableHighAccuracy: true,
			timeout: timeout,
			maximumAge: 10000,
		});

		return () => navigator.geolocation.clearWatch(watchId);
	}, [timeout]);

	return (
		location ? { ...location, locationError } : {
			coords: { lat: 42.3736, lng: -71.1097 },
			placeName: "Harvard Yard",
			locationError,
		}
	);
}
