// Tipos centralizados para la aplicación 
// 

export interface User {
	id: number;
	username: string;
	email: string;
	/** Nombre para mostrar; si no viene del backend se usa username */
	name?: string;
	role: string;
}

export interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface RegisterData {
	name: string; // Username al backend
	email: string;
	password: string;
	passwordConfirm: string;
}

export interface AuthResponse {
	user: User;
	token: string;
}
