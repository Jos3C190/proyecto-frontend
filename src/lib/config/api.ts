/**
 * URL base del backend FastAPI
 * por defecto en http://localhost:8000
 */
const base = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000';

export const API_BASE = (typeof window !== 'undefined' && base.startsWith('/'))
	? window.location.origin + base
	: base;
