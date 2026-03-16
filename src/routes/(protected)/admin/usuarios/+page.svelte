<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import {
		fetchUsers,
		fetchRoles,
		createUser,
		updateUser,
		deactivateUser,
		type UserCreateAdmin,
		type UserUpdateAdmin
	} from '$lib/services/admin.service';
	import type { User, RoleRead } from '$lib/types';
	import '../adminPage.css';

let users = $state<User[]>([]);
let roles = $state<RoleRead[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);
let showCreate = $state(false);
let editingUser = $state<User | null>(null);
let formData = $state({ first_name: '', last_name: '', email: '', password: '', role_id: 0 });
let formError = $state<string | null>(null);
let formLoading = $state(false);
let page = $state(1);
let pageSize = $state(50);
let hasNextPage = $state(false);

	function displayName(u: User): string {
		const p = u.profile;
		if (p?.first_name?.trim() || p?.last_name?.trim()) {
			return [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ').trim();
		}
		return u.email ?? '—';
	}

	function rolesLabel(u: User): string {
		if (!u.roles?.length) return '—';
		return u.roles.map((r) => r.name).join(', ');
	}

async function load(targetPage?: number) {
	loading = true;
	try {
		const currentPage = targetPage ?? page;
		const offset = (currentPage - 1) * pageSize;

		const [rawUsers, loadedRoles] = await Promise.all([
			fetchUsers({ limit: pageSize + 1, offset }),
			fetchRoles()
		]);

		users = rawUsers.slice(0, pageSize);
		roles = loadedRoles;
		hasNextPage = rawUsers.length > pageSize;
		page = currentPage;
		error = null;
	} catch (e) {
		error = e instanceof Error ? e.message : 'Error de conexión';
	} finally {
		loading = false;
	}
}

function nextPage() {
	if (loading || !hasNextPage) return;
	void load(page + 1);
}

function prevPage() {
	if (loading || page === 1) return;
	void load(page - 1);
}

function setPageSize(e: Event) {
	const v = Number((e.currentTarget as HTMLSelectElement).value);
	if (!Number.isFinite(v) || v <= 0) return;
	pageSize = v;
	void load(1);
}

	function openCreate() {
		formData = { first_name: '', last_name: '', email: '', password: '', role_id: roles[0]?.id ?? 0 };
		formError = null;
		showCreate = true;
	}

	function openEdit(u: User) {
		editingUser = u;
		formData = {
			first_name: u.profile?.first_name ?? '',
			last_name: u.profile?.last_name ?? '',
			email: u.email,
			password: '',
			role_id: u.roles?.[0]?.id ?? roles[0]?.id ?? 0
		};
		formError = null;
	}

	function closeModals() {
		showCreate = false;
		editingUser = null;
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		formError = null;
		if (!formData.email || !formData.first_name || !formData.last_name || !formData.password || formData.password.length < 8) {
			formError = 'Completa todos los campos. La contraseña debe tener al menos 8 caracteres.';
			return;
		}
		formLoading = true;
		try {
			const data: UserCreateAdmin = {
				first_name: formData.first_name,
				last_name: formData.last_name,
				email: formData.email,
				password: formData.password,
				role_id: formData.role_id
			};
			await createUser(data);
			closeModals();
			await load(page);
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al crear usuario';
		} finally {
			formLoading = false;
		}
	}

	async function handleUpdate(e: Event) {
		e.preventDefault();
		if (!editingUser) return;
		formError = null;
		formLoading = true;
		try {
			const data: UserUpdateAdmin = {
				first_name: formData.first_name,
				last_name: formData.last_name,
				email: formData.email,
				role_id: formData.role_id
			};
			await updateUser(editingUser.id, data);
			closeModals();
			await load(page);
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al actualizar usuario';
		} finally {
			formLoading = false;
		}
	}

	async function handleDeactivate(u: User) {
		if (!confirm(`¿Desactivar a ${displayName(u)}?`)) return;
		try {
			await deactivateUser(u.id);
			await load(page);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al desactivar';
		}
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'users', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load(1);
	});
</script>

<div class="admin-page">
	<h1 class="admin-title">Usuarios</h1>
	<p class="admin-desc">Gestiona los usuarios del sistema. </p>

	<div class="admin-toolbar">
		{#if hasPermission($authStore.user, 'users', 'create')}
			<button type="button" class="admin-btn" onclick={openCreate}>Crear usuario</button>
		{/if}
	</div>

	{#if loading}
		<p class="admin-loading">Cargando...</p>
	{:else if error}
		<div class="admin-error" role="alert">{error}</div>
	{:else}
		<section class="admin-section">
			<table class="admin-table">
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Email</th>
						<th>Rol</th>
						<th>Estado</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each users as u}
						<tr>
							<td>{displayName(u)}</td>
							<td>{u.email}</td>
							<td><span class="admin-badge">{rolesLabel(u)}</span></td>
							<td>
								{#if u.is_active}
									<span class="admin-badge">Activo</span>
								{:else}
									<span class="admin-badge">Inactivo</span>
								{/if}
							</td>
							<td>
								{#if u.is_active}
									{#if hasPermission($authStore.user, 'users', 'update')}
										<button
											type="button"
											class="admin-btn-secondary mr-2"
											onclick={() => openEdit(u)}
										>
											Editar
										</button>
									{/if}
									{#if hasPermission($authStore.user, 'users', 'delete')}
										<button
											type="button"
											class="admin-btn-danger"
											onclick={() => handleDeactivate(u)}
											disabled={u.id === $authStore.user?.id}
											title={u.id === $authStore.user?.id ? 'No puedes desactivar tu propia cuenta' : ''}
										>
											Desactivar
										</button>
									{/if}
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {users.length} usuario(s)</span>
					<div class="admin-page-size">
						<label for="page-size-usuarios" class="text-sm">Filas:</label>
						<select id="page-size-usuarios" value={pageSize} onchange={setPageSize}>
							<option value="10">10</option>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</select>
					</div>
				</div>

				<div class="admin-pagination-right">
					<button type="button" class="admin-btn-secondary" onclick={prevPage} disabled={loading || page === 1}>
						Anterior
					</button>
					<span class="admin-pagination-info">Página {page}</span>
					<button type="button" class="admin-btn-secondary" onclick={nextPage} disabled={loading || !hasNextPage}>
						Siguiente
					</button>
				</div>
			</div>
		</section>
	{/if}
</div>

{#if showCreate}
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal">
			<h2 class="admin-modal-title">Crear usuario</h2>
			<form onsubmit={handleCreate}>
				{#if formError}
					<div class="admin-error mb-4">{formError}</div>
				{/if}
				<div class="admin-field">
					<label for="create-first">Nombre</label>
					<input id="create-first" type="text" bind:value={formData.first_name} required />
				</div>
				<div class="admin-field">
					<label for="create-last">Apellido</label>
					<input id="create-last" type="text" bind:value={formData.last_name} required />
				</div>
				<div class="admin-field">
					<label for="create-email">Email</label>
					<input id="create-email" type="email" bind:value={formData.email} required />
				</div>
				<div class="admin-field">
					<label for="create-password">Contraseña</label>
					<input id="create-password" type="password" bind:value={formData.password} minlength="8" required />
				</div>
				<div class="admin-field">
					<label for="create-role">Rol</label>
					<select id="create-role" bind:value={formData.role_id}>
						{#each roles as r}
							<option value={r.id}>{r.name}</option>
						{/each}
					</select>
				</div>
				<div class="admin-modal-actions">
					<button type="button" class="admin-btn-secondary" onclick={closeModals}>Cancelar</button>
					<button type="submit" class="admin-btn" disabled={formLoading}>
						{formLoading ? 'Guardando...' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if editingUser}
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal">
			<h2 class="admin-modal-title">Editar usuario</h2>
			<form onsubmit={handleUpdate}>
				{#if formError}
					<div class="admin-error mb-4">{formError}</div>
				{/if}
				<div class="admin-field">
					<label for="edit-first">Nombre</label>
					<input id="edit-first" type="text" bind:value={formData.first_name} required />
				</div>
				<div class="admin-field">
					<label for="edit-last">Apellido</label>
					<input id="edit-last" type="text" bind:value={formData.last_name} required />
				</div>
				<div class="admin-field">
					<label for="edit-email">Email</label>
					<input id="edit-email" type="email" bind:value={formData.email} required />
				</div>
				<div class="admin-field">
					<label for="edit-role">Rol</label>
					<select
						id="edit-role"
						bind:value={formData.role_id}
						disabled={editingUser?.id === $authStore.user?.id}
						title={editingUser?.id === $authStore.user?.id ? 'No puedes cambiar tu propio rol' : ''}
					>
						{#each roles as r}
							<option value={r.id}>{r.name}</option>
						{/each}
					</select>
					{#if editingUser?.id === $authStore.user?.id}
						<p class="admin-hint mt-1">No puedes cambiar tu propio rol.</p>
					{/if}
				</div>
				<div class="admin-modal-actions">
					<button type="button" class="admin-btn-secondary" onclick={closeModals}>Cancelar</button>
					<button type="submit" class="admin-btn" disabled={formLoading}>
						{formLoading ? 'Guardando...' : 'Guardar'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
