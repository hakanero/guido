import { useEffect, useState } from "react";
import { reverseGeocode } from "../lib/utils";

export function useLocation(timeout = 10000): {
	coords: { lat: number; lng: number };
	placeName?: string;
	locationError?: string;
} {
	const [location, setLocation] = useState<{
		coords: { lat: number; lng: number };
		placeName?: string;
	} | null>(null);
	const [locationError, setLocationError] = useState<string | undefined>(undefined);

	useEffect(() => {
		if (!navigator.geolocation) {
			console.error("Geolocation is not supported by your browser");
			setLocationError("Geolocation is not supported by your browser");
			return;
		}

		const onSuccess = async (position: GeolocationPosition) => {
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
			if (error.code === error.PERMISSION_DENIED) {
				setLocationError("Location access denied. Please enable location services to use this app.");
			} else if (error.code === error.POSITION_UNAVAILABLE) {
				setLocationError("Location information is unavailable.");
			} else if (error.code === error.TIMEOUT) {
				setLocationError("Location request timed out.");
			} else {
				setLocationError("An unknown error occurred while getting your location.");
			}
		};

		const options = {
			enableHighAccuracy: true,
			timeout: timeout,
			maximumAge: 0,
		};

		navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

		const intervalId = setInterval(() => {
			navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
		}, 60000);

		return () => clearInterval(intervalId);
	}, [timeout]);

	return (
		location ? { ...location, locationError } : {
			coords: { lat: 42.3736, lng: -71.1097 },
			placeName: "Harvard Yard",
			locationError,
		}
	);
}
