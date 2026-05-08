import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { page } from '$app/state';

export interface PersistenceOptions<T> {
	key: string;
	defaultValues: T;
	useUrl?: boolean;
}

export function createPersistence<T extends Record<string, any>>(options: PersistenceOptions<T>) {
	const { key, defaultValues, useUrl = true } = options;

	function getInitialState(): T {
		if (!browser) return defaultValues;

		let state = { ...defaultValues };

		// 1. Try to load from sessionStorage
		const saved = sessionStorage.getItem(`persistence_${key}`);
		if (saved) {
			try {
				state = { ...state, ...JSON.parse(saved) };
			} catch (e) {
				console.error(`Error parsing persistence for ${key}`, e);
			}
		}

		// 2. Override with URL params if enabled
		if (useUrl) {
			const params = new URLSearchParams(window.location.search);
			Object.keys(defaultValues).forEach((k) => {
				const val = params.get(k);
				if (val !== null) {
					if (typeof defaultValues[k] === 'number') {
						(state as any)[k] = Number(val);
					} else if (typeof defaultValues[k] === 'boolean') {
						(state as any)[k] = val === 'true';
					} else {
						(state as any)[k] = val;
					}
				}
			});
		}

		return state;
	}

	function saveState(newState: T) {
		if (!browser) return;

		// Save to sessionStorage
		sessionStorage.setItem(`persistence_${key}`, JSON.stringify(newState));

		// Update URL if enabled
		if (useUrl) {
			const params = new URLSearchParams(window.location.search);
			let changed = false;

			Object.keys(newState).forEach((k) => {
				const currentVal = params.get(k);
				const newVal = String(newState[k]);
				
				// Don't add default values to URL to keep it clean, 
				// but keep them if they were already there to avoid weird jumpiness
				if (newState[k] === defaultValues[k]) {
					if (params.has(k)) {
						params.delete(k);
						changed = true;
					}
				} else if (currentVal !== newVal) {
					params.set(k, newVal);
					changed = true;
				}
			});

			if (changed) {
				const newUrl = `${window.location.pathname}?${params.toString()}`;
				goto(newUrl, {
					replaceState: true,
					noScroll: true,
					keepFocus: true
				});
			}
		}
	}

	function clearState() {
		if (!browser) return;
		sessionStorage.removeItem(`persistence_${key}`);
	}

	return {
		getInitialState,
		saveState,
		clearState
	};
}
