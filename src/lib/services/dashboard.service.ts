import { API_BASE } from '$lib/config/api';
import { getStoredAuth } from '$lib/services/auth.service';

export interface DashboardStats {
	total_users: number;
	total_rooms: number;
	active_reservations: number;
	total_revenue: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const res = await fetch(`${API_BASE}/admin/dashboard-stats`, {
		headers: {
			Authorization: `Bearer ${stored.token}`
		}
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al obtener métricas del dashboard');
	}

	return await res.json();
}
