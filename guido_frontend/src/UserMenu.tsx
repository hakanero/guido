import {
	UserIcon,
	SignOutIcon,
	SignInIcon,
	ClockIcon,
	GlobeIcon,
	CaretDownIcon,
} from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import type { User } from "./hooks/useAuth";

interface UserMenuProps {
	user: User | null;
	language: string;
	languages: string[];
	onLanguageChange: (lang: string) => void;
	onLogout: () => void;
	onShowHistory: () => void;
	onSignIn?: () => void;
	onCreateAccount?: () => void;
}

export default function UserMenu({
	user,
	language,
	languages,
	onLanguageChange,
	onLogout,
	onShowHistory,
	onSignIn,
	onCreateAccount,
}: UserMenuProps) {
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (
				menuRef.current &&
				!menuRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		}
		if (open) document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open]);

	const initial = user?.display_name?.charAt(0)?.toUpperCase() || "?";

	return (
		<div ref={menuRef} className="relative z-20">
			<button
				onClick={() => setOpen(!open)}
				className="flex items-center gap-2 text-white/80 hover:text-white transition-colors cursor-pointer"
			>
				{user ? (
					<div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center text-sm font-medium text-white">
						{initial}
					</div>
				) : (
					<UserIcon size={20} />
				)}
				<CaretDownIcon
					size={14}
					className={`transition-transform ${open ? "rotate-180" : ""}`}
				/>
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-black/60 backdrop-blur-2xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
					{/* User info */}
					{user && (
						<div className="px-4 py-3 border-b border-white/10">
							<p className="text-white text-sm font-medium truncate">
								{user.display_name}
							</p>
							<p className="text-white/40 text-xs truncate">
								{user.email}
							</p>
						</div>
					)}

					{/* Anonymous user prompt */}
					{!user && (
						<div className="px-4 py-3 border-b border-white/10">
							<p className="text-white/50 text-xs">
								Sign in to track your walks and unlock longer sessions
							</p>
						</div>
					)}

					{/* Language selector */}
					<div className="px-4 py-2.5 flex items-center gap-2.5 border-b border-white/10">
						<GlobeIcon size={16} className="text-white/50" />
						<select
							value={language}
							onChange={(e) => {
								onLanguageChange(e.target.value);
							}}
							className="bg-transparent text-white text-sm focus:outline-none flex-1 cursor-pointer"
						>
							{languages.map((lang) => (
								<option
									key={lang}
									value={lang}
									className="bg-gray-900 text-white"
								>
									{lang.charAt(0).toUpperCase() +
										lang.slice(1)}
								</option>
							))}
						</select>
					</div>

					{/* Walk history (auth only) */}
					{user && (
						<button
							onClick={() => {
								onShowHistory();
								setOpen(false);
							}}
							className="w-full px-4 py-2.5 flex items-center gap-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm text-left cursor-pointer"
						>
							<ClockIcon size={16} />
							Walk History
						</button>
					)}

					{/* Sign in / Create account (anon only) */}
					{!user && onSignIn && (
						<button
							onClick={() => {
								onSignIn();
								setOpen(false);
							}}
							className="w-full px-4 py-2.5 flex items-center gap-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm text-left cursor-pointer"
						>
							<SignInIcon size={16} />
							Sign In
						</button>
					)}
					{!user && onCreateAccount && (
						<button
							onClick={() => {
								onCreateAccount();
								setOpen(false);
							}}
							className="w-full px-4 py-2.5 flex items-center gap-2.5 text-white/70 hover:text-white hover:bg-white/5 transition-colors text-sm text-left cursor-pointer border-t border-white/10"
						>
							<UserIcon size={16} />
							Create Account
						</button>
					)}

					{/* Logout (auth only) */}
					{user && (
						<button
							onClick={() => {
								onLogout();
								setOpen(false);
							}}
							className="w-full px-4 py-2.5 flex items-center gap-2.5 text-red-300/70 hover:text-red-300 hover:bg-white/5 transition-colors text-sm text-left border-t border-white/10 cursor-pointer"
						>
							<SignOutIcon size={16} />
							Log Out
						</button>
					)}
				</div>
			)}
		</div>
	);
}
