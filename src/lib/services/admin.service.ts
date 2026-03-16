/**
 * Servicio para llamadas al API administrativo.
 * Requiere token JWT de un usuario con rol admin.
 */
import { API_BASE } from '$lib/config/api';
import type { User, RoleRead } from '$lib/types';

function getAuthHeaders(): HeadersInit {
	const raw = typeof window !== 'undefined' ? localStorage.getItem('auth') : null;
	const token = raw ? (JSON.parse(raw) as { token?: string })?.token : null;
	return {
		'Content-Type': 'application/json',
		...(token ? { Authorization: `Bearer ${token}` } : {})
	};
}

export interface UserCreateAdmin {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
	role_id: number;
}

export interface UserUpdateAdmin {
	first_name?: string;
	last_name?: string;
	email?: string;
	role_id?: number;
	is_active?: boolean;
}

export interface RoleCreate {
	name: string;
	description?: string | null;
}

export interface RoleUpdate {
	name?: string;
	description?: string | null;
}

export interface PolicyRead {
	sub: string;
	obj: string;
	act: string;
}

export interface PolicyCreate {
	sub: string;
	obj: string;
	act: string;
}

/** Recursos y acciones válidos para políticas (expuestos por el backend). */
export interface PermissionsMetadata {
	resources: string[];
	actions: string[];
}

export interface AuditLogRead {
	id: number;
	event_type: string;
	user_id: number | null;
	resource: string | null;
	action: string | null;
	method: string | null;
	path: string | null;
	status_code: number | null;
	ip_address: string | null;
	metadata_json: string | null;
	created_at: string;
}

export async function fetchUsers(params?: { limit?: number; offset?: number }): Promise<User[]> {
	const q = new URLSearchParams();
	if (params?.limit != null) q.set('limit', String(params.limit));
	if (params?.offset != null) q.set('offset', String(params.offset));
	const url = `${API_BASE}/admin/users${q.toString() ? '?' + q.toString() : ''}`;
	const res = await fetch(url, { headers: getAuthHeaders() });
	if (!res.ok) throw new Error(await res.json().then((d) => d.detail ?? 'Error').catch(() => 'Error'));
	return res.json();
}

export async function createUser(data: UserCreateAdmin): Promise<User> {
	const res = await fetch(`${API_BASE}/admin/users`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(data)
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(Array.isArray(body.detail) ? body.detail.map((d: { msg?: string }) => d.msg).join(', ') : body.detail ?? 'Error');
	return body;
}

export async function updateUser(userId: number, data: UserUpdateAdmin): Promise<User> {
	const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify(data)
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.detail ?? 'Error');
	return body;
}

export async function deactivateUser(userId: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
		method: 'DELETE',
		headers: getAuthHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error');
	}
}

export async function fetchRoles(): Promise<RoleRead[]> {
	const res = await fetch(`${API_BASE}/admin/roles`, { headers: getAuthHeaders() });
	if (!res.ok) throw new Error('Error al cargar roles');
	return res.json();
}

export async function createRole(data: RoleCreate): Promise<RoleRead> {
	const res = await fetch(`${API_BASE}/admin/roles`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(data)
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.detail ?? 'Error');
	return body;
}

export async function updateRole(roleId: number, data: RoleUpdate): Promise<RoleRead> {
	const res = await fetch(`${API_BASE}/admin/roles/${roleId}`, {
		method: 'PATCH',
		headers: getAuthHeaders(),
		body: JSON.stringify(data)
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.detail ?? 'Error');
	return body;
}

export async function deleteRole(roleId: number): Promise<void> {
	const res = await fetch(`${API_BASE}/admin/roles/${roleId}`, {
		method: 'DELETE',
		headers: getAuthHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error');
	}
}

export async function fetchPermissionsMetadata(): Promise<PermissionsMetadata> {
	const res = await fetch(`${API_BASE}/admin/permissions/metadata`, { headers: getAuthHeaders() });
	if (!res.ok) throw new Error('Error al cargar metadatos de permisos');
	return res.json();
}

export async function fetchPolicies(params?: { limit?: number; offset?: number }): Promise<PolicyRead[]> {
	const q = new URLSearchParams();
	if (params?.limit != null) q.set('limit', String(params.limit));
	if (params?.offset != null) q.set('offset', String(params.offset));
	const url = `${API_BASE}/admin/permissions${q.toString() ? '?' + q.toString() : ''}`;
	const res = await fetch(url, { headers: getAuthHeaders() });
	if (!res.ok) throw new Error('Error al cargar permisos');
	return res.json();
}

export async function createPolicy(data: PolicyCreate): Promise<PolicyRead> {
	const res = await fetch(`${API_BASE}/admin/permissions`, {
		method: 'POST',
		headers: getAuthHeaders(),
		body: JSON.stringify(data)
	});
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.detail ?? 'Error');
	return body;
}

export async function deletePolicy(sub: string, obj: string, act: string): Promise<void> {
	const params = new URLSearchParams({ sub, obj, act });
	const res = await fetch(`${API_BASE}/admin/permissions?${params}`, {
		method: 'DELETE',
		headers: getAuthHeaders()
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error');
	}
}

export async function fetchAuditLogs(params?: {
	event_type?: string;
	user_id?: number;
	limit?: number;
	offset?: number;
}): Promise<AuditLogRead[]> {
	const q = new URLSearchParams();
	if (params?.event_type) q.set('event_type', params.event_type);
	if (params?.user_id != null) q.set('user_id', String(params.user_id));
	if (params?.limit != null) q.set('limit', String(params.limit));
	if (params?.offset != null) q.set('offset', String(params.offset));
	const url = `${API_BASE}/admin/audit-logs${q.toString() ? '?' + q : ''}`;
	const res = await fetch(url, { headers: getAuthHeaders() });
	if (!res.ok) throw new Error('Error al cargar bitácora');
	return res.json();
}
