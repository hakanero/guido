import { CompassIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";
import { useState } from "react";

interface AuthPageProps {
	mode: "login" | "register";
	onLogin: (email: string, password: string) => Promise<void>;
	onRegister: (
		email: string,
		password: string,
		displayName: string
	) => Promise<void>;
	onBack: () => void;
	onSkip: () => void;
}

export default function AuthPage({
	mode,
	onLogin,
	onRegister,
	onBack,
	onSkip,
}: AuthPageProps) {
	const [currentMode, setCurrentMode] = useState(mode);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			if (currentMode === "login") {
				await onLogin(email, password);
			} else {
				await onRegister(email, password, displayName);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Something went wrong"
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div
			className="relative flex flex-col items-center justify-center h-screen w-full bg-cover bg-center overflow-hidden"
			style={{ backgroundImage: `url("/background.png")` }}
		>
			<div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
			<div className="absolute w-96 h-96 bg-white/15 blur-3xl rounded-full -top-20 right-10 pointer-events-none" />

			{/* Back button */}
			<button
				onClick={onBack}
				className="absolute top-4 left-4 z-20 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-sm cursor-pointer"
			>
				<ArrowLeftIcon size={18} />
				Back
			</button>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="relative z-10 w-full max-w-sm mx-auto px-6"
			>
				{/* Logo */}
				<div className="flex items-center justify-center gap-2.5 mb-8">
					<CompassIcon
						size={28}
						weight="bold"
						className="text-white"
					/>
					<span className="text-2xl font-semibold text-white tracking-tight">
						Guido
					</span>
				</div>

				{/* Form card */}
				<div className="rounded-2xl bg-white/15 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.2)] p-6">
					<h2 className="text-white text-xl font-medium mb-1">
						{currentMode === "login"
							? "Welcome back"
							: "Create account"}
					</h2>
					<p className="text-white/50 text-sm mb-6">
						{currentMode === "login"
							? "Sign in to track your walks"
							: "Start exploring with Guido"}
					</p>

					<form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
						{currentMode === "register" && (
							<input
								type="text"
								placeholder="Display name"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								required
								className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 text-sm transition-colors"
							/>
						)}
						<input
							type="email"
							placeholder="Email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 text-sm transition-colors"
						/>
						<input
							type="password"
							placeholder="Password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							minLength={6}
							className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-white/35 focus:outline-none focus:border-white/40 text-sm transition-colors"
						/>

						{error && (
							<p className="text-red-300 text-sm bg-red-500/15 rounded-lg px-3 py-2 border border-red-400/20">
								{error}
							</p>
						)}

						<motion.button
							whileHover={{ scale: 1.01 }}
							whileTap={{ scale: 0.99 }}
							type="submit"
							disabled={loading}
							className="w-full py-3 rounded-xl bg-white text-gray-900 font-medium text-sm mt-1 disabled:opacity-50 cursor-pointer"
						>
							{loading
								? "..."
								: currentMode === "login"
									? "Sign In"
									: "Create Account"}
						</motion.button>
					</form>

					<div className="mt-5 text-center">
						<button
							type="button"
							onClick={() =>
								setCurrentMode(
									currentMode === "login"
										? "register"
										: "login"
								)
							}
							className="text-white/50 text-sm hover:text-white/70 transition-colors cursor-pointer"
						>
							{currentMode === "login"
								? "Don't have an account? Sign up"
								: "Already have an account? Sign in"}
						</button>
					</div>
				</div>

				{/* Skip option */}
				<div className="mt-4 text-center">
					<button
						onClick={onSkip}
						className="text-white/30 text-xs hover:text-white/50 transition-colors cursor-pointer"
					>
						Continue without an account (5 min limit)
					</button>
				</div>
			</motion.div>
		</div>
	);
}
