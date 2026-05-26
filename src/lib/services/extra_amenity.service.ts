import { API_BASE } from '$lib/config/api';
import { getStoredAuth } from '$lib/services/auth.service';

export interface ExtraAmenityCategoryRead {
	id: number;
	name: string;
	description?: string;
}

export interface ExtraAmenityRead {
	id: number;
	name: string;
	description?: string;
	icon?: string;
	image_url?: string;
	price: number;
	category?: ExtraAmenityCategoryRead;
	is_active: boolean;
}

export interface ExtraAmenityCreate {
	name: string;
	description?: string;
	icon?: string;
	price: number;
	category_id?: number;
	is_active?: boolean;
}

export interface ExtraAmenityUpdate {
	name?: string;
	description?: string;
	icon?: string;
	price?: number;
	category_id?: number;
	is_active?: boolean;
}

export interface ExtraAmenityCategoryCreate {
	name: string;
	description?: string;
}

export interface ExtraAmenityCategoryUpdate {
	name?: string;
	description?: string;
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

export async function fetchExtraAmenityCategories(): Promise<ExtraAmenityCategoryRead[]> {
	const res = await fetch(`${API_BASE}/admin/extra-amenity-categories`, {
		headers: getHeaders()
	});
	if (!res.ok) throw new Error('Error al obtener categorías de amenidades extras');
	return res.json();
}

export async function createExtraAmenityCategory(data: ExtraAmenityCategoryCreate): Promise<ExtraAmenityCategoryRead> {
	const res = await fetch(`${API_BASE}/admin/extra-amenity-categories`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al crear categoría');
	return json;
}

export async function updateExtraAmenityCategory(id: number, data: ExtraAmenityCategoryUpdate): Promise<ExtraAmenityCategoryRead> {
	const res = await fetch(`${API_BASE}/admin/extra-amenity-categories/${id}`, {
		method: 'PATCH',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al actualizar categoría');
	return json;
}

export async function deleteExtraAmenityCategory(id: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/extra-amenity-categories/${id}`, {
		method: 'DELETE',
		headers: getHeaders()
	});
	if (!res.ok) {
		const json = await res.json().catch(() => ({}));
		throw new Error(json.detail || 'Error al eliminar categoría');
	}
}

// ── Extras Catalog ─────────────────────────────────────────────────────

export async function fetchExtraAmenities(includeInactive: boolean = false): Promise<ExtraAmenityRead[]> {
	const res = await fetch(`${API_BASE}/admin/extra-amenities?include_inactive=${includeInactive}`, {
		headers: getHeaders()
	});
	if (!res.ok) throw new Error('Error al obtener amenidades extras');
	return res.json();
}

export async function fetchPublicExtraAmenities(): Promise<ExtraAmenityRead[]> {
	const res = await fetch(`${API_BASE}/reservations/extra-amenities`);
	if (!res.ok) throw new Error('Error al obtener amenidades extras públicas');
	return res.json();
}

export async function createExtraAmenity(data: ExtraAmenityCreate): Promise<ExtraAmenityRead> {
	const res = await fetch(`${API_BASE}/admin/extra-amenities`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al crear amenidad extra');
	return json;
}

export async function updateExtraAmenity(id: number, data: ExtraAmenityUpdate): Promise<ExtraAmenityRead> {
	const res = await fetch(`${API_BASE}/admin/extra-amenities/${id}`, {
		method: 'PATCH',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al actualizar amenidad extra');
	return json;
}

export async function deleteExtraAmenity(id: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/extra-amenities/${id}`, {
		method: 'DELETE',
		headers: getHeaders()
	});
	if (!res.ok) {
		const json = await res.json().catch(() => ({}));
		throw new Error(json.detail || 'Error al eliminar amenidad extra');
	}
}

export async function uploadExtraAmenityImage(id: number, file: File): Promise<ExtraAmenityRead> {
	const formData = new FormData();
	formData.append('file', file);
	
	const res = await fetch(`${API_BASE}/admin/extra-amenities/${id}/upload-image`, {
		method: 'POST',
		headers: getHeaders(true),
		body: formData
	});
	const json = await res.json();
	if (!res.ok) throw new Error(json.detail || 'Error al subir la imagen');
	return json;
}
