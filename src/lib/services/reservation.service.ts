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

export async function addClientReservationExtra(resId: number, extraId: number, quantity: number, notes?: string): Promise<any> {
	const res = await fetch(`${API_BASE}/reservations/${resId}/extras`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify({ extra_amenity_id: extraId, quantity, notes })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al agregar el extra');
	}
	return await res.json();
}

export async function updateClientReservationExtra(resId: number, pivotId: number, quantity: number, notes?: string): Promise<any> {
	const res = await fetch(`${API_BASE}/reservations/${resId}/extras/${pivotId}`, {
		method: 'PATCH',
		headers: getHeaders(),
		body: JSON.stringify({ quantity, notes })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al actualizar el extra');
	}
	return await res.json();
}

export async function removeClientReservationExtra(resId: number, pivotId: number): Promise<void> {
	const res = await fetch(`${API_BASE}/reservations/${resId}/extras/${pivotId}`, {
		method: 'DELETE',
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al eliminar el extra');
	}
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

export async function createPayment(id: number, data: { amount: number, method: string, receipt_type: string }): Promise<any> {
	const res = await fetch(`${API_BASE}/payments/`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify({
			reservation_id: id,
			...data
		})
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al procesar el pago');
	}
	return await res.json();
}

export async function refundReservation(id: number): Promise<any> {
	const res = await fetch(`${API_BASE}/admin/reservations/${id}/refund`, {
		method: 'POST',
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al procesar el reembolso');
	}
	return await res.json();
}

export async function cancelPayment(paymentId: number): Promise<void> {
	const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
		method: 'DELETE',
		headers: getHeaders()
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al cancelar el pago');
	}
}

// ── Extras in Reservations (Admin) ──────────────────────────────────────

export async function addAdminReservationExtra(resId: number, extraId: number, quantity: number, notes?: string): Promise<any> {
	const res = await fetch(`${API_BASE}/admin/reservations/${resId}/extras`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify({ extra_amenity_id: extraId, quantity, notes })
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al agregar el extra');
	}
	return await res.json();
}

export async function removeAdminReservationExtra(resId: number, pivotId: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/reservations/${resId}/extras/${pivotId}`, {
		method: 'DELETE',
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al eliminar el extra');
	}
}

export async function payAdminReservationExtra(resId: number, pivotId: number): Promise<any> {
	const res = await fetch(`${API_BASE}/admin/reservations/${resId}/extras/${pivotId}/pay`, {
		method: 'PATCH',
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al marcar el extra como pagado');
	}
	return await res.json();
}

export async function getRecentReservations(limit: number = 6): Promise<any[]> {
	const res = await fetch(`${API_BASE}/admin/recent-reservations?limit=${limit}`, {
		headers: getHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al cargar reservaciones recientes');
	}
	return await res.json();
}
