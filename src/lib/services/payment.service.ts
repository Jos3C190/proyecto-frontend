import { API_BASE } from '$lib/config/api';
import type { PaymentCreate, PaymentRead } from '$lib/types/payment';
import { getStoredAuth } from '$lib/services/auth.service';

function getHeaders() {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${stored.token}`
	};
}

export async function processPayment(data: PaymentCreate): Promise<PaymentRead> {
	const res = await fetch(`${API_BASE}/payments/`, {
		method: 'POST',
		headers: getHeaders(),
		body: JSON.stringify(data)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al procesar el pago');
	}

	return await res.json();
}

export async function getPayment(id: number): Promise<PaymentRead> {
	const res = await fetch(`${API_BASE}/payments/${id}`, {
		headers: getHeaders()
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al obtener el pago');
	}

	return await res.json();
}

export async function processTransferPayment(
	reservationId: number,
	amount: number,
	file: File,
	receiptType?: string
): Promise<PaymentRead> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const formData = new FormData();
	formData.append('reservation_id', reservationId.toString());
	formData.append('amount', amount.toString());
	formData.append('file', file);
	if (receiptType) {
		formData.append('receipt_type', receiptType);
	}

	const res = await fetch(`${API_BASE}/payments/transfer`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${stored.token}`
		},
		body: formData
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al subir el comprobante de pago');
	}

	return await res.json();
}
