import { API_BASE } from '$lib/config/api';
import { getStoredAuth } from '$lib/services/auth.service';

export interface IncidentalChargeCategoryRead {
	id: number;
	name: string;
	description?: string;
	icon?: string;
	is_active: boolean;
}

export interface IncidentalChargeCategoryCreate {
	name: string;
	description?: string;
	icon?: string;
}

export interface IncidentalChargeCategoryUpdate {
	name?: string;
	description?: string;
	icon?: string;
	is_active?: boolean;
}

export interface IncidentalChargeStaffRead {
	id: number;
	email: string;
}

export interface IncidentalChargeRead {
	id: number;
	reservation_id: number;
	category?: IncidentalChargeCategoryRead;
	description: string;
	amount: number;
	quantity: number;
	total_amount: number;
	apply_tax: boolean;
	payment_status: 'pending' | 'paid' | 'waived';
	waived_reason?: string;
	evidence_url?: string;
	notes?: string;
	created_by_user_id: number;
	created_by?: IncidentalChargeStaffRead;
	created_at: string;
	updated_at: string;
}

export interface IncidentalChargeCreate {
	category_id?: number;
	description: string;
	amount: number;
	quantity?: number;
	apply_tax?: boolean;
	notes?: string;
}

export interface IncidentalChargeUpdate {
	category_id?: number;
	description?: string;
	amount?: number;
	quantity?: number;
	apply_tax?: boolean;
	notes?: string;
}

// Helper to get auth headers
function getHeaders(isFormData = false): Record<string, string> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');
	
	const headers: Record<string, string> = {
		'Authorization': `Bearer ${stored.token}`
	};
	if (!isFormData) {
		headers['Content-Type'] = 'application/json';
	}
	return headers;
}

// ── Categories ─────────────────────────────────────────────────────────

export async function fetchIncidentalCategories(): Promise<IncidentalChargeCategoryRead[]> {
	const res = await fetch(`${API_BASE}/admin/incidental-categories`, {
		headers: getHeaders()
	});
	if (!res.ok) throw new Error('Error al obtener categorías de cargos incidentales');
	return res.json();
}

export async function createIncidentalCategory(data: IncidentalChargeCategoryCreate): Promise<IncidentalChargeCategoryRead> {
	const res = await fetch(`${API_BASE}/admin/incidental-categories`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al crear categoría de incidental');
	return json;
}

export async function updateIncidentalCategory(id: number, data: IncidentalChargeCategoryUpdate): Promise<IncidentalChargeCategoryRead> {
	const res = await fetch(`${API_BASE}/admin/incidental-categories/${id}`, {
		method: 'PUT',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al actualizar categoría de incidental');
	return json;
}

export async function deleteIncidentalCategory(id: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/incidental-categories/${id}`, {
		method: 'DELETE',
		headers: getHeaders()
	});
	if (!res.ok) {
		const json = await res.json().catch(() => ({}));
		throw new Error(json.detail || 'Error al eliminar categoría de incidental');
	}
}

// ── Charges ────────────────────────────────────────────────────────────

export async function fetchAllIncidentals(): Promise<IncidentalChargeRead[]> {
	const res = await fetch(`${API_BASE}/admin/incidentals`, {
		headers: getHeaders()
	});
	if (!res.ok) throw new Error('Error al obtener todos los cargos incidentales');
	return res.json();
}

export async function fetchReservationIncidentals(resId: number): Promise<IncidentalChargeRead[]> {
	const res = await fetch(`${API_BASE}/admin/reservations/${resId}/incidentals`, {
		headers: getHeaders()
	});
	if (!res.ok) throw new Error('Error al obtener cargos incidentales de la reservación');
	return res.json();
}

export async function createReservationIncidental(resId: number, data: IncidentalChargeCreate): Promise<IncidentalChargeRead> {
	const res = await fetch(`${API_BASE}/admin/reservations/${resId}/incidentals`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al registrar cargo incidental');
	return json;
}

export async function updateReservationIncidental(chargeId: number, data: IncidentalChargeUpdate): Promise<IncidentalChargeRead> {
	const res = await fetch(`${API_BASE}/admin/incidentals/${chargeId}`, {
		method: 'PUT',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al actualizar cargo incidental');
	return json;
}

export async function waiveReservationIncidental(chargeId: number, reason: string): Promise<IncidentalChargeRead> {
	const res = await fetch(`${API_BASE}/admin/incidentals/${chargeId}/waive`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify({ reason })
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al condonar cargo incidental');
	return json;
}

export async function deleteReservationIncidental(chargeId: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/incidentals/${chargeId}`, {
		method: 'DELETE',
		headers: getHeaders()
	});
	if (!res.ok) {
		const json = await res.json().catch(() => ({}));
		throw new Error(json.detail || 'Error al eliminar cargo incidental');
	}
}

export async function uploadIncidentalEvidence(chargeId: number, file: File): Promise<IncidentalChargeRead> {
	const formData = new FormData();
	formData.append('file', file);
	
	const res = await fetch(`${API_BASE}/admin/incidentals/${chargeId}/evidence`, {
		method: 'POST',
		headers: getHeaders(true),
		body: formData
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al subir evidencia fotográfica');
	return json;
}
