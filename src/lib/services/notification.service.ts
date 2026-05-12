/**
 * Servicio de notificaciones — Consumo de endpoints REST del backend.
 */
import { API_BASE } from '$lib/config/api';

function getToken(): string | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem('auth');
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed?.token || null;
	} catch {
		return null;
	}
}

function authHeaders(): HeadersInit {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface Notification {
	id: number;
	user_id: number;
	type: string;
	severity: string;
	title: string;
	message: string;
	reference_type: string | null;
	reference_id: number | null;
	is_read: boolean;
	created_at: string;
}

/**
 * Obtiene las notificaciones del usuario actual.
 */
export async function fetchNotifications(
	skip = 0,
	limit = 20,
	unreadOnly = false
): Promise<Notification[]> {
	const params = new URLSearchParams({
		skip: String(skip),
		limit: String(limit),
		unread_only: String(unreadOnly)
	});
	const res = await fetch(`${API_BASE}/notifications?${params}`, {
		headers: authHeaders()
	});
	if (!res.ok) return [];
	return res.json();
}

/**
 * Obtiene la cantidad de notificaciones no leídas.
 */
export async function fetchUnreadCount(): Promise<number> {
	const res = await fetch(`${API_BASE}/notifications/unread-count`, {
		headers: authHeaders()
	});
	if (!res.ok) return 0;
	const data = await res.json();
	return data.count ?? 0;
}

/**
 * Marca una notificación como leída.
 */
export async function markAsRead(notificationId: number): Promise<boolean> {
	const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
		method: 'PATCH',
		headers: authHeaders()
	});
	return res.ok;
}

/**
 * Marca todas las notificaciones como leídas.
 */
export async function markAllAsRead(): Promise<boolean> {
	const res = await fetch(`${API_BASE}/notifications/read-all`, {
		method: 'PATCH',
		headers: authHeaders()
	});
	return res.ok;
}

/**
 * Elimina una notificación.
 */
export async function deleteNotification(notificationId: number): Promise<boolean> {
	const res = await fetch(`${API_BASE}/notifications/${notificationId}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	return res.ok;
}
