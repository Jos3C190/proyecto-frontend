/**
 * Store del tema (modo claro/oscuro).
 * Persiste en localStorage y respeta preferencia del sistema cuando está en system
 */

import { writable, derived } from 'svelte/store';

const STORAGE_KEY = 'theme';

export type ThemePreference = 'light' | 'dark' | 'system';

function getStored(): ThemePreference {
	if (typeof window === 'undefined') return 'system';
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
	return 'system';
}

function setStored(value: ThemePreference): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, value);
}

function isDarkFromSystem(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** siempre light o dark (para aplicar clase en el DOM) */
export function getEffectiveTheme(preference: ThemePreference): 'light' | 'dark' {
	if (preference === 'light') return 'light';
	if (preference === 'dark') return 'dark';
	return isDarkFromSystem() ? 'dark' : 'light';
}

function createThemeStore() {
	// Valor inicial es system; en cliente getStored() lee localStorage
	const { subscribe, set, update } = writable<ThemePreference>(getStored());

	const store = {
		subscribe,
		set(value: ThemePreference) {
			setStored(value);
			set(value);
		},
		/** Alterna entre light, dark, system */
		cycle() {
			update((current) => {
				const next: ThemePreference =
					current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
				setStored(next);
				return next;
			});
		},
		setLight() {
			store.set('light');
		},
		setDark() {
			store.set('dark');
		},
		setSystem() {
			store.set('system');
		}
	};

	return store;
}

export const themeStore = createThemeStore();
export const effectiveTheme = derived(themeStore, ($theme) => getEffectiveTheme($theme));
