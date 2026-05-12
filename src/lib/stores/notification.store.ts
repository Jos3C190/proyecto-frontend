/**
 * Store reactivo de notificaciones con polling automático.
 * Se activa cuando el usuario está autenticado y se detiene al cerrar sesión.
 */
import { writable, derived, get } from 'svelte/store';
import { authStore } from '$lib/stores/auth.store';
import {
	fetchNotifications,
	fetchUnreadCount,
	markAsRead as apiMarkAsRead,
	markAllAsRead as apiMarkAllAsRead,
	deleteNotification as apiDeleteNotification,
	type Notification
} from '$lib/services/notification.service';

const POLL_INTERVAL_MS = 30_000; // 30 segundos

// Stores internos
const _notifications = writable<Notification[]>([]);
const _unreadCount = writable<number>(0);
const _loading = writable<boolean>(false);

// Exports públicos (readonly)
export const notifications = { subscribe: _notifications.subscribe };
export const unreadCount = { subscribe: _unreadCount.subscribe };
export const notificationsLoading = { subscribe: _loading.subscribe };

let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Carga las notificaciones y el contador de no leídas.
 */
async function refresh() {
	try {
		const [notifs, count] = await Promise.all([
			fetchNotifications(0, 20),
			fetchUnreadCount()
		]);
		_notifications.set(notifs);
		_unreadCount.set(count);
	} catch {
		// Silenciar errores de red en polling
	}
}

/**
 * Inicia el polling automático.
 */
function startPolling() {
	stopPolling();
	refresh(); // Carga inicial inmediata
	pollTimer = setInterval(refresh, POLL_INTERVAL_MS);
}

/**
 * Detiene el polling.
 */
function stopPolling() {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
}

/**
 * Marca una notificación como leída.
 */
async function markAsRead(id: number) {
	const ok = await apiMarkAsRead(id);
	if (ok) {
		_notifications.update(list =>
			list.map(n => (n.id === id ? { ...n, is_read: true } : n))
		);
		_unreadCount.update(c => Math.max(0, c - 1));
	}
}

/**
 * Marca todas las notificaciones como leídas.
 */
async function markAllAsRead() {
	const ok = await apiMarkAllAsRead();
	if (ok) {
		_notifications.update(list => list.map(n => ({ ...n, is_read: true })));
		_unreadCount.set(0);
	}
}

/**
 * Elimina una notificación.
 */
async function deleteNotification(id: number) {
	const ok = await apiDeleteNotification(id);
	if (ok) {
		const wasUnread = get(_notifications).find(n => n.id === id && !n.is_read);
		_notifications.update(list => list.filter(n => n.id !== id));
		if (wasUnread) {
			_unreadCount.update(c => Math.max(0, c - 1));
		}
	}
}

// Exportar acciones
export const notificationActions = {
	refresh,
	startPolling,
	stopPolling,
	markAsRead,
	markAllAsRead,
	deleteNotification
};

// Auto-start/stop basado en autenticación
if (typeof window !== 'undefined') {
	authStore.subscribe(auth => {
		if (auth.user) {
			startPolling();
		} else {
			stopPolling();
			_notifications.set([]);
			_unreadCount.set(0);
		}
	});
}
