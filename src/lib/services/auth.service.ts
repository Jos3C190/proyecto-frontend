/**
 * Servicio de autenticación.
 * Conectado al backend FastAPI (login por email, UserRead con roles y profile)
 */

import { API_BASE } from '$lib/config/api';
import type { AuthResponse, LoginCredentials, RegisterData, User, RoleRead, UserProfileRead } from '$lib/types';

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

/** Tipo que devuelve el backend en GET /users/me (incluye permissions) */
interface UserMeReadRaw {
	id: number;
	email: string;
	is_active: boolean;
	is_verified: boolean;
	roles: RoleRead[];
	profile?: UserProfileRead | null;
	permissions?: string[];
}

/** Tipo que devuelve GET /admin/users (sin permissions) */
interface UserReadRaw {
	id: number;
	email: string;
	is_active: boolean;
	is_verified: boolean;
	roles: RoleRead[];
	profile?: UserProfileRead | null;
}

/** Mapea UserMeRead del backend (con permissions) a User del frontend */
function mapUser(raw: UserMeReadRaw): User {
	return {
		id: raw.id,
		email: raw.email,
		is_active: raw.is_active ?? true,
		is_verified: raw.is_verified ?? false,
		roles: raw.roles ?? [],
		profile: raw.profile ?? null,
		permissions: raw.permissions ?? []
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
 * Inicia sesión POST /auth/login (email + password) y luego GET /users/me
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
	const email = credentials.email?.trim();
	const password = credentials.password;
	if (!email || !password) {
		throw new Error('Email y contraseña son obligatorios');
	}

	const loginRes = await fetch(`${API_BASE}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password })
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
 * Registro POST /users/register (first_name, last_name, email, password) y luego login
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
	const first_name = data.first_name.trim();
	const last_name = data.last_name.trim();
	const email = data.email.trim();
	const password = data.password;

	const registerRes = await fetch(`${API_BASE}/users/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ first_name, last_name, email, password })
	});

	if (!registerRes.ok) {
		const err = await registerRes.json().catch(() => ({}));
		const msg = Array.isArray(err.detail)
			? err.detail.map((d: { msg?: string }) => d.msg).join(', ')
			: err.detail;
		throw new Error(msg ?? 'Error al registrarse');
	}

	return login({ email, password });
}

/**
 * Cierra sesión (solo en local)
 */
export function logout(): void {
	clearStored();
}
