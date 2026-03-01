// Tipos alineados con el backend FastAPI (UserRead, RBAC, profile)

export interface RoleRead {
	id: number;
	name: string;
	description?: string | null;
}

export interface UserProfileRead {
	id: number;
	first_name: string;
	last_name: string;
	phone?: string | null;
	avatar_url?: string | null;
	date_of_birth?: string | null;
}

export interface User {
	id: number;
	email: string;
	is_active: boolean;
	is_verified: boolean;
	roles: RoleRead[];
	profile?: UserProfileRead | null;
}

export interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
}

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterData {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	passwordConfirm: string;
}

export interface AuthResponse {
	user: User;
	token: string;
}

/** Nombre para mostrar: perfil (nombre + apellido) o email */
export function getDisplayName(user: User | null): string {
	if (!user) return 'Usuario';
	const p = user.profile;
	if (p?.first_name?.trim() || p?.last_name?.trim()) {
		return [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ').trim();
	}
	return user.email ?? 'Usuario';
}

/** Comprueba si el usuario tiene un rol por nombre (ej. admin) */
export function hasRole(user: User | null, roleName: string): boolean {
	if (!user?.roles?.length) return false;
	return user.roles.some((r) => r.name === roleName);
}
