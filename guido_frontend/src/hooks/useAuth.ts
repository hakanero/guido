import { useState, useEffect, useCallback } from "react";
import { apiLogin, apiRegister, apiLogout, apiGetMe } from "../lib/api";

export interface User {
	id: number;
	email: string;
	display_name: string;
	session_id?: number;
}

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	// Check for existing token on mount
	useEffect(() => {
		const token = localStorage.getItem("guido_token");
		if (!token) {
			setLoading(false);
			return;
		}

		apiGetMe()
			.then((data) => {
				if (data) {
					setUser({
						id: data.id,
						email: data.email,
						display_name: data.display_name,
						session_id: data.session_id,
					});
				} else {
					// Token invalid
					localStorage.removeItem("guido_token");
					localStorage.removeItem("guido_session_id");
				}
			})
			.catch(() => {
				localStorage.removeItem("guido_token");
				localStorage.removeItem("guido_session_id");
			})
			.finally(() => setLoading(false));
	}, []);

	const login = useCallback(async (email: string, password: string) => {
		const data = await apiLogin(email, password);
		setUser({
			id: data.user.id,
			email: data.user.email,
			display_name: data.user.display_name,
			session_id: data.session_id,
		});
		return data;
	}, []);

	const register = useCallback(
		async (email: string, password: string, displayName: string) => {
			const data = await apiRegister(email, password, displayName);
			setUser({
				id: data.user.id,
				email: data.user.email,
				display_name: data.user.display_name,
				session_id: data.session_id,
			});
			return data;
		},
		[]
	);

	const logout = useCallback(async () => {
		await apiLogout();
		setUser(null);
	}, []);

	return {
		user,
		loading,
		login,
		register,
		logout,
		isAuthenticated: !!user,
	};
}
