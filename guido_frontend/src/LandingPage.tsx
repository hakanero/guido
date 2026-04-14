import { CompassIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";

interface LandingPageProps {
	onNavigate: (page: "login" | "register") => void;
	onSkip: () => void;
}

export default function LandingPage({ onNavigate, onSkip }: LandingPageProps) {
	return (
		<div
			className="relative flex flex-col items-center justify-center h-screen w-full bg-cover bg-center overflow-hidden"
			style={{ backgroundImage: `url("/background.png")` }}
		>
			<div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

			{/* Decorative blur orb */}
			<div className="absolute w-96 h-96 bg-white/15 blur-3xl rounded-full -top-20 right-10 pointer-events-none" />

			<motion.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7, ease: "easeOut" }}
				className="relative z-10 flex flex-col items-center text-center px-6 max-w-md"
			>
				{/* Logo */}
				<motion.div
					initial={{ scale: 0.8, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					transition={{ duration: 0.5, delay: 0.2 }}
					className="flex items-center gap-3 mb-6"
				>
					<div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-lg">
						<CompassIcon
							size={30}
							weight="bold"
							className="text-white"
						/>
					</div>
					<h1 className="text-4xl font-semibold text-white tracking-tight drop-shadow-md">
						Guido
					</h1>
				</motion.div>

				{/* Tagline */}
				<p className="text-white/80 text-lg mb-10 leading-relaxed">
					Your AI-powered walking tour guide.
					<br />
					<span className="text-white/60 text-base">
						Discover the history beneath your feet.
					</span>
				</p>

				{/* CTA Buttons */}
				<div className="flex flex-col gap-3 w-full max-w-xs">
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => onNavigate("register")}
						className="w-full py-3.5 rounded-xl bg-white text-gray-900 font-medium text-base shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
					>
						Create Account
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => onNavigate("login")}
						className="w-full py-3.5 rounded-xl bg-white/15 backdrop-blur-xl border border-white/25 text-white font-medium text-base hover:bg-white/20 transition-colors cursor-pointer"
					>
						Sign In
					</motion.button>
				</div>

				{/* Skip */}
				<button
					onClick={onSkip}
					className="mt-6 text-white/40 text-sm hover:text-white/60 transition-colors cursor-pointer"
				>
					Continue without an account →
				</button>
			</motion.div>
		</div>
	);
}
