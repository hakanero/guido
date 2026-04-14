import { useEffect, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, Polyline, CircleMarker } from "react-leaflet";
import { useLocation } from "./hooks/useLocationData";
import L from "leaflet";

function MapUpdater({ center }: { center: [number, number] }) {
	const map = useMap();

	useEffect(() => {
		map.setView(center, map.getZoom());
	}, [center, map]);

	return null;
}

const owlIcon = new L.Icon({
	iconUrl: "/owl.png",
	iconSize: [50, 50],
	iconAnchor: [25, 50],
	popupAnchor: [0, -50],
});

interface NavigationPageProps {
	visitedCoordinates: Array<{ lat: number; lng: number }>;
}

export default function NavigationPage({ visitedCoordinates }: NavigationPageProps) {
	const { coords } = useLocation();
	const mapRef = useRef(null);

	const pathPositions: [number, number][] = visitedCoordinates.map(coord => [coord.lat, coord.lng]);

	return (
		<div className="h-100 mx-auto w-100 sm:h-120 sm:w-120 overflow-hidden">
			{/* Map */}
			<MapContainer
				ref={mapRef}
				center={[coords.lat, coords.lng]}
				zoom={16}
				className="h-full w-full"
				zoomControl={false}
			>
				<TileLayer
					attribution="&copy; OpenStreetMap"
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				<MapUpdater center={[coords.lat, coords.lng]} />
				
				{/* Draw path through all visited coordinates */}
				{pathPositions.length > 1 && (
					<Polyline 
						positions={pathPositions} 
						color="#3b82f6" 
						weight={3}
						opacity={0.7}
					/>
				)}
				
				{/* Mark all visited locations with small circles */}
				{visitedCoordinates.map((coord, index) => (
					<CircleMarker
						key={`${coord.lat}-${coord.lng}-${index}`}
						center={[coord.lat, coord.lng]}
						radius={6}
						fillColor="#3b82f6"
						fillOpacity={0.6}
						color="#1e40af"
						weight={2}
					/>
				))}
				
				{/* Current position with owl icon */}
				<Marker position={[coords.lat, coords.lng]} icon={owlIcon} />
			</MapContainer>
		</div>
	);
}
