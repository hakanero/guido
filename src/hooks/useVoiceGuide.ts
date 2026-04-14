import { useRef, useState } from "react";

export const useVoiceGuide = () => {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isReset, setIsReset] = useState(true);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const startVoiceGuide = () => {
		if (audioRef.current) {
			audioRef.current.play();
		}
		setIsPlaying(true);
		setIsReset(false);
	};

	const stopVoiceGuide = () => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
		setIsPlaying(false);
		setIsReset(true);
	};

	const pauseVoiceGuide = () => {
		if (audioRef.current) {
			audioRef.current.pause();
		}
		setIsPlaying(false);
	};

	const restartVoiceGuide = () => {
		if (audioRef.current) {
			audioRef.current.currentTime = 0;
			audioRef.current.play();
		}
		setIsPlaying(true);
	};

	return {
		startVoiceGuide,
		stopVoiceGuide,
		pauseVoiceGuide,
		restartVoiceGuide,
		isPlaying,
		audioRef,
		isReset,
	};
};
