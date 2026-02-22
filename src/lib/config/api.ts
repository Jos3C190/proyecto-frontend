/**
 * URL base del backend FastAPI
 * por defecto en http://localhost:8000
 */
export const API_BASE =
	(typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
	'http://localhost:8000';
