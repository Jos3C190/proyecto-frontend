import { API_BASE } from '$lib/config/api';
import type { RoomRead, RoomCreate, RoomUpdate, RoomAuditLog, RoomTypeRead, RoomTypeCreate, RoomSearchResponse } from '$lib/types/room';
import { getStoredAuth } from '$lib/services/auth.service';

export async function searchRooms(
	checkIn: string,
	checkOut: string,
	guests: number,
	roomType?: string
): Promise<RoomSearchResponse[]> {
	const params = new URLSearchParams({
		check_in: checkIn,
		check_out: checkOut,
		guests: guests.toString()
	});
	if (roomType) {
		params.append('room_type', roomType);
	}

	const stored = getStoredAuth();
	const headers: Record<string, string> = {};
	if (stored) {
		headers['Authorization'] = `Bearer ${stored.token}`;
	}

	const res = await fetch(`${API_BASE}/rooms/search?${params.toString()}`, {
		headers
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al buscar habitaciones');
	}

	return await res.json();
}

export async function getAdminRoomTypes(): Promise<RoomTypeRead[]> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const response = await fetch(`${API_BASE}/admin/room-types`, {
		headers: { 'Authorization': `Bearer ${stored.token}` }
	});
	const data = await response.json();
	if (!response.ok) throw new Error(data.detail || 'Error al obtener tipos de habitación');
	return data;
}

export async function createAdminRoomType(payload: RoomTypeCreate): Promise<RoomTypeRead> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const response = await fetch(`${API_BASE}/admin/room-types`, {
		method: 'POST',
		headers: { 
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${stored.token}` 
		},
		body: JSON.stringify(payload)
	});
	const data = await response.json();
	if (!response.ok) throw new Error(data.detail || 'Error al crear tipo de habitación');
	return data;
}

export async function deleteAdminRoomType(id: number): Promise<void> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const response = await fetch(`${API_BASE}/admin/room-types/${id}`, {
		method: 'DELETE',
		headers: { 'Authorization': `Bearer ${stored.token}` }
	});
	const data = await response.json().catch(() => ({})); // Catch JSON parsing error for empty responses
	if (!response.ok) throw new Error(data.detail || 'Error al eliminar tipo de habitación');
}

export async function getRoom(id: number): Promise<RoomRead> {
	const stored = getStoredAuth();
	const headers: Record<string, string> = {};
	if (stored) {
		headers['Authorization'] = `Bearer ${stored.token}`;
	}

	const res = await fetch(`${API_BASE}/rooms/${id}`, {
		headers
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al obtener detalles de la habitación');
	}

	return await res.json();
}

export async function getPublicRooms(): Promise<RoomRead[]> {
	const res = await fetch(`${API_BASE}/rooms/public`);
	if (!res.ok) throw new Error('Error al obtener habitaciones públicas.');
	return res.json();
}

export async function getAdminRooms(): Promise<RoomRead[]> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const res = await fetch(`${API_BASE}/rooms/`, {
		headers: { Authorization: `Bearer ${stored.token}` }
	});

	if (!res.ok) throw new Error('Error al obtener habitaciones.');
	return res.json();
}

export async function createRoom(data: any): Promise<RoomRead> {
	const stored = getStoredAuth();
	const res = await fetch(`${API_BASE}/rooms/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${stored?.token}`
		},
		body: JSON.stringify(data)
	});
	if (!res.ok) throw new Error('Error al crear habitación.');
	return res.json();
}

export async function updateRoom(id: number, data: any): Promise<RoomRead> {
	const stored = getStoredAuth();
	const res = await fetch(`${API_BASE}/rooms/${id}`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${stored?.token}`
		},
		body: JSON.stringify(data)
	});
	if (!res.ok) throw new Error('Error al actualizar habitación.');
	return res.json();
}

export async function deleteRoom(id: number): Promise<void> {
	const stored = getStoredAuth();
	const res = await fetch(`${API_BASE}/rooms/${id}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${stored?.token}` }
	});
	if (!res.ok) throw new Error('Error al eliminar habitación.');
}

export async function uploadRoomImage(file: File): Promise<{ url: string }> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const formData = new FormData();
	formData.append('file', file);

	const res = await fetch(`${API_BASE}/admin/upload-image`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${stored.token}`
		},
		body: formData
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al subir la imagen');
	}

	return await res.json();
}

