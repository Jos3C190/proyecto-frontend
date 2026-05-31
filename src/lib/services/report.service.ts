import { API_BASE } from '$lib/config/api';
import { getStoredAuth } from '$lib/services/auth.service';

// --- Interfaces para los Reportes ---

export interface ExecutiveSummary {
	total_revenue: number;
	adr: number;
	rev_par: number;
	occupancy_rate: number;
	total_reservations: number;
	cancellation_rate: number;
	revenue_growth_pct: number;
	incidental_revenue?: number;
}

export interface DailyRevenueItem {
	date: string;
	room_revenue: number;
	extra_revenue: number;
	incidental_revenue?: number;
	tax_revenue?: number;
	total_revenue: number;
}

export interface RevenueByMethodItem {
	method: string;
	amount: number;
	percentage: number;
	count: number;
}

export interface RoomTypeRevenueItem {
	room_type: string;
	revenue: number;
	percentage: number;
}

export interface FinancialReport {
	total_revenue: number;
	room_revenue: number;
	extra_revenue: number;
	incidental_revenue?: number;
	tax_revenue?: number;
	adr: number;
	rev_par: number;
	revenue_by_method: RevenueByMethodItem[];
	daily_revenue: DailyRevenueItem[];
	room_type_revenue: RoomTypeRevenueItem[];
}

export interface RoomOccupancyItem {
	room_number: string;
	room_type: string;
	occupied_nights: number;
	occupancy_pct: number;
	revenue: number;
}

export interface OccupancyTrendItem {
	date: string;
	occupied_rooms: number;
	occupancy_pct: number;
}

export interface RoomTypeOccupancyItem {
	room_type: string;
	occupied_nights: number;
	occupancy_pct: number;
}

export interface OccupancyReport {
	occupancy_rate: number;
	total_nights_sold: number;
	available_rooms_count: number;
	room_occupancy: RoomOccupancyItem[];
	occupancy_trend: OccupancyTrendItem[];
	room_type_occupancy: RoomTypeOccupancyItem[];
}

export interface TopCustomerItem {
	user_id: number;
	name: string;
	email: string;
	reservations_count: number;
	total_spent: number;
}

export interface CustomerCountryItem {
	country: string;
	customer_count: number;
	total_spent: number;
}

export interface CustomerReport {
	total_customers: number;
	new_customers: number;
	returning_customers_pct: number;
	avg_spent_per_customer: number;
	top_customers: TopCustomerItem[];
	customer_countries: CustomerCountryItem[];
}

export interface TopExtraItem {
	extra_id: number;
	name: string;
	category: string;
	quantity_sold: number;
	revenue: number;
}

export interface CategoryDistributionItem {
	category: string;
	quantity_sold: number;
	revenue: number;
	percentage: number;
}

export interface ExtrasReport {
	total_extra_revenue: number;
	total_extras_sold: number;
	avg_extra_spent_per_res: number;
	top_extras: TopExtraItem[];
	category_distribution: CategoryDistributionItem[];
}

// --- Funciones del Servicio API ---

async function fetchReport<T>(endpoint: string, startDate?: string, endDate?: string): Promise<T> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const url = new URL(`${API_BASE}/admin/reports/${endpoint}`);
	if (startDate) url.searchParams.append('start_date', startDate);
	if (endDate) url.searchParams.append('end_date', endDate);

	const res = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${stored.token}`
		}
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? `Error al obtener reporte: ${endpoint}`);
	}

	return await res.json();
}

export async function getExecutiveSummary(startDate?: string, endDate?: string): Promise<ExecutiveSummary> {
	return fetchReport<ExecutiveSummary>('summary', startDate, endDate);
}

export async function getFinancialReport(startDate?: string, endDate?: string): Promise<FinancialReport> {
	return fetchReport<FinancialReport>('financial', startDate, endDate);
}

export async function getOccupancyReport(startDate?: string, endDate?: string): Promise<OccupancyReport> {
	return fetchReport<OccupancyReport>('occupancy', startDate, endDate);
}

export async function getCustomerReport(startDate?: string, endDate?: string): Promise<CustomerReport> {
	return fetchReport<CustomerReport>('customers', startDate, endDate);
}

export async function getExtrasReport(startDate?: string, endDate?: string): Promise<ExtrasReport> {
	return fetchReport<ExtrasReport>('extras', startDate, endDate);
}
