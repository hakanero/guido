import { useRef, useState, useCallback } from "react";

export const useVoiceGuide = () => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isReset, setIsReset] = useState(true);
	const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [audioFinished, setAudioFinished] = useState(false);

	const startVoiceGuide = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.playbackRate = playbackSpeed;
			audioRef.current.play();
		}
		setIsPlaying(true);
		setIsReset(false);
		setAudioFinished(false);
	}, [playbackSpeed]);

	const stopVoiceGuide = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		setIsPlaying(false);
		setIsReset(true);
	}, []);

	const pauseVoiceGuide = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.pause();
		}
		setIsPlaying(false);
	}, []);

	const restartVoiceGuide = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.currentTime = 0;
			audioRef.current.playbackRate = playbackSpeed;
			audioRef.current.play();
		}
		setIsPlaying(true);
	}, [playbackSpeed]);

	const changeSpeed = useCallback((speed: number) => {
		setPlaybackSpeed(speed);
		if (audioRef.current) {
			audioRef.current.playbackRate = speed;
		}
	}, []);

	// Call this to set up the onended listener whenever audio source changes
	const setupAudioListeners = useCallback(() => {
		if (audioRef.current) {
			audioRef.current.onended = () => {
				setIsPlaying(false);
				setAudioFinished(true);
			};
		}
	}, []);

	return {
		startVoiceGuide,
		stopVoiceGuide,
		pauseVoiceGuide,
		restartVoiceGuide,
		changeSpeed,
		setupAudioListeners,
		isPlaying,
		audioRef,
		isReset,
		playbackSpeed,
		audioFinished,
		setAudioFinished,
	};
};
