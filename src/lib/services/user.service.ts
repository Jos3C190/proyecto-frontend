import { API_BASE } from '$lib/config/api';
import type { User, UserProfileUpdate } from '$lib/types';
import { authStore } from '$lib/stores/auth.store';
import { getStoredAuth } from '$lib/services/auth.service';

export async function getMyProfile(): Promise<User> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const res = await fetch(`${API_BASE}/users/me`, {
		headers: { Authorization: `Bearer ${stored.token}` }
	});
	if (!res.ok) throw new Error('Error al obtener perfil');
	
	const updatedUser = await res.json();
	authStore.setAuth(updatedUser, stored.token);
	return updatedUser;
}

export async function updateProfile(data: UserProfileUpdate): Promise<User> {
	const stored = getStoredAuth();
	if (!stored) throw new Error('No autenticado');

	const res = await fetch(`${API_BASE}/users/me`, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${stored.token}`
		},
		body: JSON.stringify(data)
	});

	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		const msg = Array.isArray(err.detail)
			? err.detail.map((d: { msg?: string }) => d.msg).join(', ')
			: err.detail;
		throw new Error(msg ?? 'Error al actualizar perfil');
	}

	const updatedUser = await res.json();
	// Actualizar el store de auth con la nueva información
	authStore.setAuth(updatedUser, stored.token);
	return updatedUser;
}
