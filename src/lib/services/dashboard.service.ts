import { API_BASE } from '$lib/config/api';
import { getStoredAuth } from '$lib/services/auth.service';

export interface DashboardKPI {
	total: number;
	growth: number;
	adr?: number;
	revpar?: number;
	revpar_growth?: number;
	price_efficiency?: number;
}

export interface RoomDistribution {
	total: number;
	occupied: number;
	available: number;
	arrivals_7d: number;
	departures_7d: number;
}

export interface RevenueTrendItem {
	date: string;
	amount: number;
	type: 'actual' | 'forecast';
}

export interface MarketMixItem {
	label: string;
	value: number;
}

export interface DashboardStats {
	kpis: {
		users: DashboardKPI;
		rooms: RoomDistribution;
		reservations: DashboardKPI;
		revenue: DashboardKPI;
	};
	revenue_trend: RevenueTrendItem[];
	market_mix: MarketMixItem[];
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
