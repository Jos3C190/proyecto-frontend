import { API_BASE } from '$lib/config/api';
import type { 
	ReservationCreate, 
	ReservationRead, 
	AdminReservationCreate, 
	AdminReservationUpdate, 
	AdminPaymentCreate 
} from '$lib/types/reservation';
import { getStoredAuth } from '$lib/services/auth.service';

function getHeaders() {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${stored.token}`
	};
}

export async function createReservation(data: ReservationCreate): Promise<ReservationRead> {
	const res = await fetch(`${API_BASE}/reservations/`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al crear la reservación');
	}

	return await res.json();
}

export async function getMyReservations(): Promise<ReservationRead[]> {
	const res = await fetch(`${API_BASE}/reservations/my`, {
		headers: getHeaders()
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al obtener sus reservaciones');
	}

	return await res.json();
}

export async function getReservation(id: number): Promise<ReservationRead> {
	const res = await fetch(`${API_BASE}/reservations/${id}`, {
		headers: getHeaders()
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al obtener de la reservación');
	}

	return await res.json();
}

export async function cancelReservation(id: number): Promise<void> {
	const res = await fetch(`${API_BASE}/reservations/${id}`, {
		method: 'DELETE',
		headers: getHeaders()
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al cancelar la reservación');
	}
}

export async function getAdminReservations(roomId?: number): Promise<ReservationRead[]> {
	const url = new URL(`${API_BASE}/admin/reservations`);
	if (roomId) {
		url.searchParams.append('room_id', roomId.toString());
	}

	const res = await fetch(url.toString(), {
		headers: getHeaders()
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al cargar reservaciones globales');
	}

	return await res.json();
}

export async function createAdminReservation(data: AdminReservationCreate): Promise<ReservationRead> {
	const res = await fetch(`${API_BASE}/admin/reservations`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al crear la reservación (Admin)');
	}
	return await res.json();
}

export async function updateAdminReservation(id: number, data: AdminReservationUpdate): Promise<ReservationRead> {
	const res = await fetch(`${API_BASE}/admin/reservations/${id}`, {
		method: 'PUT',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al actualizar la reservación (Admin)');
	}
	return await res.json();
}

export async function deleteAdminReservation(id: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/reservations/${id}`, {
		method: 'DELETE',
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al eliminar la reservación (Admin)');
	}
}

export async function payAdminReservation(id: number, data: AdminPaymentCreate): Promise<any> {
	const res = await fetch(`${API_BASE}/admin/reservations/${id}/pay`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al registrar el pago (Admin)');
	}
	return await res.json();
}

export async function getAdminWompiLink(id: number, redirectUrl: string): Promise<string> {
	const res = await fetch(`${API_BASE}/admin/reservations/${id}/wompi-link?redirect_url=${encodeURIComponent(redirectUrl)}`, {
		method: 'POST',
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al generar enlace de Wompi');
	}
	const data = await res.json();
	return data.url;
}

export async function getUserWompiLink(id: number, redirectUrl: string): Promise<string> {
	const res = await fetch(`${API_BASE}/payments/${id}/wompi-link?redirect_url=${encodeURIComponent(redirectUrl)}`, {
		method: 'POST',
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al generar enlace de Wompi');
	}
	const data = await res.json();
	return data.url;
}
