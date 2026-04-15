import { type Component } from 'svelte';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	duration?: number;
}

class ToastManager {
	toasts = $state<Toast[]>([]);

	add(message: string, type: ToastType = 'info', duration = 5000) {
		const id = Math.random().toString(36).substring(2, 9);
		const newToast: Toast = { id, message, type, duration };
		this.toasts = [...this.toasts, newToast];

		if (duration > 0) {
			setTimeout(() => {
				this.remove(id);
			}, duration);
		}
	}

	remove(id: string) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	success(msg: string) { this.add(msg, 'success'); }
	error(msg: string) { this.add(msg, 'error'); }
	info(msg: string) { this.add(msg, 'info'); }
	warning(msg: string) { this.add(msg, 'warning'); }
}

export const toast = new ToastManager();
