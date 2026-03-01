/**
 * Validadores reutilizables para formularios
 */

export const VALIDATION = {
	email: {
		required: 'El email es obligatorio',
		invalid: 'Introduce un email válido'
	},
	username: {
		required: 'El usuario es obligatorio',
		minLength: (min: number) => `Mínimo ${min} caracteres`
	},
	password: {
		required: 'La contraseña es obligatoria',
		minLength: (min: number) => `Mínimo ${min} caracteres`,
		mismatch: 'Las contraseñas no coinciden'
	},
	name: {
		required: 'El nombre es obligatorio',
		minLength: (min: number) => `Mínimo ${min} caracteres`
	}
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
	if (!value?.trim()) return VALIDATION.email.required;
	if (!EMAIL_REGEX.test(value.trim())) return VALIDATION.email.invalid;
	return null;
}

export function validateRequired(value: string, field: 'email' | 'name' | 'password' | 'username'): string | null {
	const trimmed = value?.trim() ?? ''; 
	if (!trimmed) {
		if (field === 'email') return VALIDATION.email.required;
		if (field === 'name') return VALIDATION.name.required;
		if (field === 'username') return VALIDATION.username.required;
		return VALIDATION.password.required;
	}

	return null;
}

export function validatePassword(value: string, minLength = 6): string | null {
	if (!value?.trim()) return VALIDATION.password.required;
	if (value.length < minLength) return VALIDATION.password.minLength(minLength);
	return null;
}

export function validatePasswordMatch(password: string, passwordConfirm: string): string | null {
	if (password !== passwordConfirm) return VALIDATION.password.mismatch;
	return null;
}

export function validateName(value: string, minLength = 3): string | null {
	if (!value?.trim()) return VALIDATION.name.required;
	if (value.trim().length < minLength) return VALIDATION.name.minLength(minLength);
	return null;
}

export function validateUsername(value: string, minLength = 3): string | null {
	if (!value?.trim()) return VALIDATION.username.required;
	if (value.trim().length < minLength) return VALIDATION.username.minLength(minLength);
	return null;
}
