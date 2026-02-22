/**
 * Servicio de autenticación.
 * Conectado al backend FastAPI
 */

import { API_BASE } from '$lib/config/api';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '$lib/types';

const STORAGE_KEY = 'auth';

function getStored(): { user: User; token: string } | null {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { user: User; token: string };
		return parsed?.user && parsed?.token ? parsed : null;
	} catch {
		return null;
	}
}

function setStored(user: User, token: string): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
}

function clearStored(): void {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(STORAGE_KEY);
}

/** Mapea UserRead del backend a User del frontend */
function mapUser(raw: { id: number; username: string; email: string; role: string }): User {
	return {
		id: raw.id,
		username: raw.username,
		email: raw.email,
		name: raw.username,
		role: raw.role ?? 'user'
	};
}

/**
 * Obtiene el estado persistido (para hidratar el store al cargar la app)
 */
export function getStoredAuth(): { user: User; token: string } | null {
	return getStored();
}

/**
 * Obtiene el usuario actual con el token (GET /users/me)
 */
async function fetchCurrentUser(token: string): Promise<User> {
	const res = await fetch(`${API_BASE}/users/me`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al obtener el usuario');
	}
	const data = await res.json();
	return mapUser(data);
}

/**
 * Inicia sesión POST /auth/login y luego GET /users/me para obtener el usuario y rol
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
	const username = credentials.username?.trim();
	const password = credentials.password;
	if (!username || !password) {
		throw new Error('Usuario y contraseña son obligatorios');
	}

	const loginRes = await fetch(`${API_BASE}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password })
	});

	if (!loginRes.ok) {
		const err = await loginRes.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Credenciales inválidas');
	}

	const { access_token } = await loginRes.json();
	const user = await fetchCurrentUser(access_token);
	setStored(user, access_token);
	return { user, token: access_token };
}

/**
 * Registro POST /users/register y luego login para obtener token y usuario
 * El backend espera username, email, password 
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
	const username = data.name.trim();
	const email = data.email.trim();
	const password = data.password;

	const registerRes = await fetch(`${API_BASE}/users/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, email, password })
	});

	if (!registerRes.ok) {
		const err = await registerRes.json().catch(() => ({}));
		const msg = Array.isArray(err.detail) ? err.detail.map((d: { msg?: string }) => d.msg).join(', ') : err.detail;
		throw new Error(msg ?? 'Error al registrarse');
	}

	// Tras registrar, hacer login para obtener token
	return login({ username, password });
}

/**
 * Cierra sesión (solo en local - no se ha implementado en el backend, esto se hará despues de que se implemente)
 */
export function logout(): void {
	clearStored();
}
