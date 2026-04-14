import {
	CompassIcon,
	MapPinIcon,
	PauseIcon,
	PlayIcon,
	SpeakerHighIcon,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "./hooks/useLocationData";
import { getData, apiSaveLocation } from "./lib/api";
import { haversineDistance } from "./lib/utils";
import { useVoiceGuide } from "./hooks/useVoiceGuide";
import { useAuth } from "./hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import NavigationPage from "./NavigationPage";
import LandingPage from "./LandingPage";
import AuthPage from "./AuthPage";
import UserMenu from "./UserMenu";
import HistoryPage from "./HistoryPage";

type AppView = "landing" | "auth" | "main";
type MainPage = "home" | "navigation" | "history";

const ANON_LIMIT_SECONDS = 5 * 60;
const AUTH_LIMIT_SECONDS = 60 * 60;
const MOVEMENT_THRESHOLD_KM = 0.03; // 30 meters

export default function App() {
	const { coords, placeName, locationError } = useLocation();
	const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
	const [isLoadingAudio, setIsLoadingAudio] = useState(false);
	const [language, setLanguage] = useState("english");
	const currentLanguageRef = useRef("english");
	const [visitedCoordinates, setVisitedCoordinates] = useState<
		Array<{ lat: number; lng: number }>
	>([]);
	const [transcript, setTranscript] = useState<string>("");

	// ---- Refs for latest values (avoids effect re-triggers) ----
	const latestCoordsRef = useRef(coords);
	const lastFetchCoordsRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
	const hasFetchedInitial = useRef(false);
	const isFetchingRef = useRef(false);
	const viewRef = useRef<AppView>("landing"); // track view in a ref for effects

	// Keep ref up-to-date with latest coords (no effects depend on this)
	latestCoordsRef.current = coords;

	const languages = [
		"english", "spanish", "french", "german", "chinese",
		"turkish", "hindi", "arabic", "russian", "korean",
	];

	// Auth
	const { user, loading: authLoading, login, register, logout, isAuthenticated } = useAuth();
	const [view, setView] = useState<AppView>("landing");
	const [authMode, setAuthMode] = useState<"login" | "register">("login");
	const [page, setPage] = useState<MainPage>("home");

	// Keep viewRef in sync
	viewRef.current = view;

	// Usage timer
	const [usageStartTime] = useState<number>(Date.now());
	const [usageExpired, setUsageExpired] = useState(false);

	useEffect(() => {
		if (authLoading) return;
		if (isAuthenticated) setView("main");
	}, [authLoading, isAuthenticated]);

	useEffect(() => {
		const interval = setInterval(() => {
			const elapsed = (Date.now() - usageStartTime) / 1000;
			const limit = isAuthenticated ? AUTH_LIMIT_SECONDS : ANON_LIMIT_SECONDS;
			if (elapsed >= limit) setUsageExpired(true);
		}, 10000);
		return () => clearInterval(interval);
	}, [usageStartTime, isAuthenticated]);

	useEffect(() => {
		if (isAuthenticated) setUsageExpired(false);
	}, [isAuthenticated]);

	// Voice guide
	const {
		startVoiceGuide,
		pauseVoiceGuide,
		isPlaying,
		audioRef,
		playbackSpeed,
		changeSpeed,
		audioFinished,
		setAudioFinished,
		setupAudioListeners,
	} = useVoiceGuide();

	// ---- Core fetch function (never touches audio element directly) ----
	const fetchAudio = useCallback(
		async (fetchCoords: { lat: number; lng: number }, lang: string): Promise<{ voiceUrl: string; transcript: string } | null> => {
			if (isFetchingRef.current) return null;
			isFetchingRef.current = true;
			try {
				const data = await getData(fetchCoords, lang);
				if (lang === currentLanguageRef.current && data.voiceUrl) {
					lastFetchCoordsRef.current = fetchCoords;
					return { voiceUrl: data.voiceUrl, transcript: data.transcript || "" };
				}
				return null;
			} catch (e) {
				console.error("getData error:", e);
				return null;
			} finally {
				isFetchingRef.current = false;
			}
		},
		[]
	);

	// ---- Load audio into the element and optionally auto-play ----
	const loadAudio = useCallback(
		(url: string, text: string, autoPlay: boolean) => {
			setVoiceUrl(url);
			setTranscript(text);
			setIsLoadingAudio(false);

			if (audioRef.current) {
				audioRef.current.src = url;
				audioRef.current.playbackRate = playbackSpeed;
				audioRef.current.load();
				setupAudioListeners();
				if (autoPlay) {
					audioRef.current.play().catch((err) =>
						console.error("Auto-play failed:", err)
					);
				}
			}
		},
		[audioRef, playbackSpeed, setupAudioListeners]
	);

	// ---- 1. Initial fetch (runs once when we get real coordinates AND user is on main view) ----
	useEffect(() => {
		if (hasFetchedInitial.current) return;
		if (viewRef.current !== "main") return; // Don't fetch on landing/auth pages

		const isDefault =
			Math.abs(coords.lat - 42.3736) < 0.0001 &&
			Math.abs(coords.lng - -71.1097) < 0.0001;
		if (isDefault) return;

		hasFetchedInitial.current = true;
		setVisitedCoordinates([{ lat: coords.lat, lng: coords.lng }]);
		setIsLoadingAudio(true);

		fetchAudio(coords, currentLanguageRef.current).then((result) => {
			if (result) loadAudio(result.voiceUrl, result.transcript, false);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [coords.lat, coords.lng, view]);

	// ---- 2. Track visited coordinates for the polyline (display only, no fetches) ----
	useEffect(() => {
		if (!hasFetchedInitial.current) return;

		setVisitedCoordinates((prev) => {
			const isDuplicate = prev.some(
				(c) => Math.abs(c.lat - coords.lat) < 0.0001 && Math.abs(c.lng - coords.lng) < 0.0001
			);
			return isDuplicate ? prev : [...prev, { lat: coords.lat, lng: coords.lng }];
		});
	}, [coords.lat, coords.lng]);

	// ---- 3. When audio finishes → check if user moved → auto-fetch + auto-play ----
	// This is the ONLY place that triggers new audio after the initial fetch.
	// It never interrupts playback because it only runs when audioFinished is true.
	useEffect(() => {
		if (!audioFinished) return;
		if (!hasFetchedInitial.current) return;

		const currentCoords = latestCoordsRef.current;
		const distance = haversineDistance(lastFetchCoordsRef.current, currentCoords);

		if (distance > MOVEMENT_THRESHOLD_KM) {
			// User has moved — fetch new audio for their new location and auto-play
			setAudioFinished(false);
			setIsLoadingAudio(true);

			fetchAudio(currentCoords, currentLanguageRef.current).then((result) => {
				if (result) {
					loadAudio(result.voiceUrl, result.transcript, true);
				} else {
					setIsLoadingAudio(false);
				}
			});
		} else {
			// User hasn't moved — don't fetch, just reset the finished flag
			setAudioFinished(false);
		}
	}, [audioFinished, fetchAudio, loadAudio, setAudioFinished]);

	// ---- 4. Language change → stop current, fetch new (manual action, OK to interrupt) ----
	const previousLanguageRef = useRef("english");
	useEffect(() => {
		if (language === previousLanguageRef.current) return;
		previousLanguageRef.current = language;
		currentLanguageRef.current = language;

		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
			audioRef.current.src = "";
		}

		setVoiceUrl(null);
		setIsLoadingAudio(true);

		const currentCoords = latestCoordsRef.current;
		fetchAudio(currentCoords, language).then((result) => {
			if (result) {
				loadAudio(result.voiceUrl, result.transcript, false);
			} else {
				setIsLoadingAudio(false);
			}
		});
	}, [language, audioRef, fetchAudio, loadAudio]);

	// ---- 5. Save location to backend (authenticated only, display-only) ----
	useEffect(() => {
		if (!isAuthenticated || !coords.lat || !coords.lng) return;
		apiSaveLocation(coords.lat, coords.lng, placeName).catch(console.error);
	}, [coords.lat, coords.lng, isAuthenticated, placeName]);

	// ---- Handlers ----
	const handleLogin = useCallback(async (email: string, password: string) => {
		await login(email, password);
		setView("main");
	}, [login]);

	const handleRegister = useCallback(async (email: string, password: string, displayName: string) => {
		await register(email, password, displayName);
		setView("main");
	}, [register]);

	const handleLogout = useCallback(async () => {
		await logout();
		setView("landing");
		setPage("home");
	}, [logout]);

	const handleSkip = useCallback(() => {
		setView("main");
	}, []);

	const speedOptions = [1, 1.25, 1.5, 1.75, 2];

	// Loading state
	if (authLoading) {
		return (
			<div className="flex items-center justify-center h-screen w-full bg-cover bg-center" style={{ backgroundImage: `url("/background.png")` }}>
				<div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
				<div className="relative z-10 animate-spin h-8 w-8 border-2 border-white/60 border-t-transparent rounded-full" />
			</div>
		);
	}

	if (view === "landing") {
		return (
			<LandingPage
				onNavigate={(target) => { setAuthMode(target); setView("auth"); }}
				onSkip={handleSkip}
			/>
		);
	}

	if (view === "auth") {
		return (
			<AuthPage
				mode={authMode}
				onLogin={handleLogin}
				onRegister={handleRegister}
				onBack={() => setView("landing")}
				onSkip={handleSkip}
			/>
		);
	}

	return (
		<div
			className="relative flex flex-col items-center justify-center h-screen w-full bg-cover bg-center overflow-hidden"
			style={{ backgroundImage: `url("/background.png")` }}
		>
			<div className="absolute top-3 right-3 z-20">
				<UserMenu
					user={user}
					language={language}
					languages={languages}
					onLanguageChange={setLanguage}
					onLogout={handleLogout}
					onShowHistory={() => setPage("history")}
					onSignIn={() => { setAuthMode("login"); setView("auth"); }}
					onCreateAccount={() => { setAuthMode("register"); setView("auth"); }}
				/>
			</div>
			<div className="absolute top-3 left-3.5 z-10 flex items-center text-white font-semibold gap-2 text-lg">
				<CompassIcon size={26} weight="bold" /> Guido
			</div>
			<div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

			<AnimatePresence>
				{usageExpired && !isAuthenticated && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 z-30 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center px-6"
					>
						<div className="bg-white/15 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 max-w-sm text-center shadow-xl">
							<h3 className="text-white text-lg font-medium mb-2">Free preview ended</h3>
							<p className="text-white/60 text-sm mb-5">Create an account to continue exploring with Guido for up to 1 hour per session.</p>
							<div className="flex flex-col gap-2.5">
								<button onClick={() => { setAuthMode("register"); setView("auth"); }} className="w-full py-3 rounded-xl bg-white text-gray-900 font-medium text-sm cursor-pointer">Create Account</button>
								<button onClick={() => { setAuthMode("login"); setView("auth"); }} className="w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-medium text-sm cursor-pointer">Sign In</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="my-10 relative z-10 flex flex-col items-center text-center pt-10 rounded-2xl bg-white/20 backdrop-blur-2xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
				<div className="px-6">
					<h2 className="text-white/80 text-xs tracking-widest uppercase mb-1.5 font-medium">Current Location</h2>
					<h1 className="text-3xl font-semibold text-white mb-8 drop-shadow-md flex items-center justify-center gap-1.5">
						<MapPinIcon weight="fill" className="h-7" /> {placeName}
					</h1>
					{locationError && (
						<div className="mb-5 p-2.5 bg-red-500/30 backdrop-blur-sm rounded-xl border border-red-400/40 text-white text-sm">⚠️ {locationError}</div>
					)}
				</div>

				{page === "history" ? (
					<div className="w-full h-80 sm:h-96">
						<HistoryPage onBack={() => setPage("home")} />
					</div>
				) : page === "navigation" ? (
					<div className="w-full h-full">
						<NavigationPage visitedCoordinates={visitedCoordinates} />
					</div>
				) : (
					<div className="px-6 flex flex-col items-center text-center mb-6">
						<motion.div
							transition={{ duration: 0.5 }}
							className={`flex items-center space-x-6 ${isPlaying ? "animate-pulse" : ""}`}
						>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className={`flex items-center justify-center w-24 h-24 rounded-full bg-white/30 backdrop-blur-2xl border border-white/40 shadow-lg ${
									voiceUrl && !isLoadingAudio ? "cursor-pointer" : "cursor-not-allowed opacity-50"
								}`}
								onClick={voiceUrl && !isLoadingAudio ? (isPlaying ? pauseVoiceGuide : startVoiceGuide) : undefined}
								disabled={!voiceUrl || isLoadingAudio}
							>
								{isLoadingAudio ? (
									<div className="animate-spin h-9 w-9 border-3 border-gray-900 border-t-transparent rounded-full" />
								) : isPlaying ? (
									<PauseIcon size={38} weight="fill" className="text-gray-900" />
								) : (
									<PlayIcon size={38} weight="fill" className="text-gray-900" />
								)}
							</motion.button>
						</motion.div>

						<p className="mt-5 text-lg text-white font-medium drop-shadow">
							{isLoadingAudio ? "Loading tour..." : isPlaying ? "Pause the tour" : "Start the tour"}
						</p>

						<div className="mt-3 flex items-center gap-2">
							<SpeakerHighIcon size={14} className="text-white/40" />
							{speedOptions.map((speed) => (
								<button
									key={speed}
									onClick={() => changeSpeed(speed)}
									className={`px-2 py-0.5 rounded-md text-xs transition-colors cursor-pointer ${
										playbackSpeed === speed ? "bg-white/25 text-white font-medium" : "text-white/40 hover:text-white/60"
									}`}
								>
									{speed}×
								</button>
							))}
						</div>

						<p className="mt-3 text-sm text-white/80 max-w-80 drop-shadow max-h-16 overflow-y-auto leading-relaxed">
							{transcript}
						</p>
					</div>
				)}

				<div className="h-14 w-full flex items-start justify-center text-sm">
					{(["home", "navigation", "history"] as const).map((tab, i) => (
						<div
							key={tab}
							className={`h-full flex items-center justify-center text-white cursor-pointer transition-colors flex-1 ${
								page !== tab ? "border-t border-white/20" : ""
							} ${i > 0 ? "border-l border-white/20" : ""} ${
								page === tab ? "text-white font-medium" : "text-white/50 hover:text-white/70"
							}`}
							onClick={() => setPage(tab)}
						>
							{tab.charAt(0).toUpperCase() + tab.slice(1)}
						</div>
					))}
				</div>
			</div>

			<div className="absolute w-96 h-96 bg-white/15 blur-3xl rounded-full -top-20 right-10 pointer-events-none" />
			<audio ref={audioRef} />
		</div>
	);
}
