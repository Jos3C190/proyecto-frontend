/**
 * Store global de autenticación
 * Único punto de acceso al estado de sesión desde componentes.
 * La persistencia en localStorage se delega al servicio.
 */

import { writable, derived } from 'svelte/store';
import type { User } from '$lib/types';
import * as authService from '$lib/services/auth.service';

function createAuthStore() {
	const { subscribe, set, update } = writable<{ user: User | null; token: string | null }>({
		user: null,
		token: null
	});

	if (typeof window !== 'undefined') {
		const stored = authService.getStoredAuth();
		if (stored) set({ user: stored.user, token: stored.token });
	}

	return {
		subscribe,

		setAuth(user: User, token: string) {
			set({ user, token });
		},

		clearAuth() {
			authService.logout();
			set({ user: null, token: null });
		},

		async login(email: string, password: string) {
			const { user, token } = await authService.login({ email, password });
			set({ user, token });
			return { user, token };
		},

		async register(
			first_name: string,
			last_name: string,
			email: string,
			password: string,
			passwordConfirm: string
		) {
			const { user, token } = await authService.register({
				first_name,
				last_name,
				email,
				password,
				passwordConfirm
			});
			set({ user, token });
			return { user, token };
		}
	};
}
export const authStore = createAuthStore();

export const isAuthenticated = derived(authStore, ($auth) => !!$auth.user && !!$auth.token);
export const currentUser = derived(authStore, ($auth) => $auth.user);
