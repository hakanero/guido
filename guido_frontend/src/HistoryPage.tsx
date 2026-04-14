import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { apiGetHistory, apiGetSessionDetail } from "./lib/api";
import {
	MapContainer,
	TileLayer,
	Polyline,
	CircleMarker,
} from "react-leaflet";

interface Session {
	id: number;
	started_at: string;
	ended_at: string | null;
	point_count: number;
}

interface Point {
	latitude: number;
	longitude: number;
	place_name: string;
	recorded_at: string;
}

interface HistoryPageProps {
	onBack: () => void;
}

export default function HistoryPage({ onBack }: HistoryPageProps) {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedSession, setSelectedSession] = useState<number | null>(null);
	const [points, setPoints] = useState<Point[]>([]);
	const [loadingPoints, setLoadingPoints] = useState(false);

	useEffect(() => {
		apiGetHistory()
			.then(setSessions)
			.catch(console.error)
			.finally(() => setLoading(false));
	}, []);

	const handleSelectSession = async (sessionId: number) => {
		setSelectedSession(sessionId);
		setLoadingPoints(true);
		try {
			const data = await apiGetSessionDetail(sessionId);
			setPoints(data.points || []);
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingPoints(false);
		}
	};

	const formatDate = (iso: string) => {
		const d = new Date(iso);
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Map view for selected session
	if (selectedSession !== null) {
		const positions: [number, number][] = points.map((p) => [
			p.latitude,
			p.longitude,
		]);
		const center: [number, number] =
			positions.length > 0
				? positions[Math.floor(positions.length / 2)]
				: [42.3736, -71.1097];

		return (
			<div className="w-full h-full flex flex-col">
				<button
					onClick={() => {
						setSelectedSession(null);
						setPoints([]);
					}}
					className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-3 px-4 pt-3 cursor-pointer"
				>
					<ArrowLeftIcon size={14} />
					Back to sessions
				</button>

				{loadingPoints ? (
					<div className="flex-1 flex items-center justify-center">
						<div className="animate-spin h-6 w-6 border-2 border-white/60 border-t-transparent rounded-full" />
					</div>
				) : points.length === 0 ? (
					<div className="flex-1 flex items-center justify-center text-white/40 text-sm">
						No location data for this session
					</div>
				) : (
					<div className="flex-1 min-h-0 px-4 pb-4">
						<div className="h-full w-full rounded-xl overflow-hidden border border-white/10">
							<MapContainer
								center={center}
								zoom={15}
								className="h-full w-full"
								zoomControl={false}
							>
								<TileLayer
									attribution="&copy; OpenStreetMap"
									url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
								/>
								{positions.length > 1 && (
									<Polyline
										positions={positions}
										color="#3b82f6"
										weight={3}
										opacity={0.8}
									/>
								)}
								{points.map((p, i) => (
									<CircleMarker
										key={i}
										center={[p.latitude, p.longitude]}
										radius={5}
										fillColor="#3b82f6"
										fillOpacity={0.7}
										color="#1e40af"
										weight={2}
									/>
								))}
							</MapContainer>
						</div>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className="w-full h-full flex flex-col">
			<div className="flex items-center gap-2 px-4 pt-3 pb-2">
				<button
					onClick={onBack}
					className="text-white/60 hover:text-white transition-colors cursor-pointer"
				>
					<ArrowLeftIcon size={16} />
				</button>
				<h3 className="text-white text-base font-medium">
					Walk History
				</h3>
			</div>

			<div className="flex-1 overflow-y-auto px-4 pb-4">
				{loading ? (
					<div className="flex items-center justify-center py-10">
						<div className="animate-spin h-6 w-6 border-2 border-white/60 border-t-transparent rounded-full" />
					</div>
				) : sessions.length === 0 ? (
					<div className="text-white/40 text-sm text-center py-10">
						No walk sessions yet.
						<br />
						Start exploring to build your history!
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{sessions.map((session) => (
							<button
								key={session.id}
								onClick={() =>
									handleSelectSession(session.id)
								}
								className="w-full text-left px-4 py-3 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-colors cursor-pointer"
							>
								<div className="text-white text-sm font-medium">
									{formatDate(session.started_at)}
								</div>
								<div className="flex items-center gap-3 mt-1">
									<span className="text-white/40 text-xs">
										{session.point_count} locations tracked
									</span>
									{session.ended_at ? (
										<span className="text-white/30 text-xs">
											Ended
										</span>
									) : (
										<span className="text-green-400/60 text-xs">
											Active
										</span>
									)}
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
