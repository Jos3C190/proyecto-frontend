<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
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
	import { Country, State, City } from 'country-state-city';
	import UserDetailModal from '$lib/components/admin/UserDetailModal.svelte';
	import '../adminPage.css';

let users = $state<User[]>([]);
let roles = $state<RoleRead[]>([]);
let loading = $state(true);
let error = $state<string | null>(null);
let showCreate = $state(false);
let viewingUser = $state<User | null>(null);
let editingUser = $state<User | null>(null);
let formData = $state({
	first_name: '',
	last_name: '',
	email: '',
	password: '',
	role_id: 0,
	phone: '',
	date_of_birth: '',
	country: 'SV',
	department: '',
	municipality: '',
	address_complement: ''
});
let formError = $state<string | null>(null);

let countries = $derived(Country.getAllCountries());
let departments = $derived(formData.country ? State.getStatesOfCountry(formData.country) : []);
let municipalities = $derived(formData.country && formData.department ? City.getCitiesOfState(formData.country, formData.department) : []);

// Calcular fecha máxima hace 18 años exactos
let maxDobString = $derived.by(() => {
	const d = new Date();
	d.setFullYear(d.getFullYear() - 18);
	return d.toISOString().split('T')[0];
});
let formLoading = $state(false);
let page = $state(1);
let pageSize = $state(50);
let hasNextPage = $state(false);

let hasAccess = $derived(hasPermission($authStore.user, 'users', 'read'));

// Filtros
let searchQuery = $state('');
let selectedRole = $state('');

let filteredUsers = $derived(users.filter(u => {
	const search = searchQuery.toLowerCase().trim();
	const matchesSearch = search === '' || 
		(u.email && u.email.toLowerCase().includes(search)) || 
		(u.profile?.first_name?.toLowerCase().includes(search)) || 
		(u.profile?.last_name?.toLowerCase().includes(search));
	
	const matchesRole = selectedRole === '' || (u.roles && u.roles.some(r => r.name === selectedRole));
	return matchesSearch && matchesRole;
}));

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
		formData = {
			first_name: '',
			last_name: '',
			email: '',
			password: '',
			role_id: roles[0]?.id ?? 0,
			phone: '',
			date_of_birth: '',
			country: 'SV',
			department: '',
			municipality: '',
			address_complement: ''
		};
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
			role_id: u.roles?.[0]?.id ?? roles[0]?.id ?? 0,
			phone: u.profile?.phone ?? '',
			date_of_birth: u.profile?.date_of_birth ?? '',
			country: u.profile?.country ?? 'SV',
			department: u.profile?.department ?? '',
			municipality: u.profile?.municipality ?? '',
			address_complement: u.profile?.address_complement ?? ''
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
				role_id: formData.role_id,
				phone: formData.phone || null,
				date_of_birth: formData.date_of_birth || null,
				country: formData.country || null,
				department: formData.department || null,
				municipality: formData.municipality || null,
				address_complement: formData.address_complement || null
			};
			await createUser(data);
			toast.success('Usuario creado con éxito');
			closeModals();
			await load(page);
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al crear usuario';
			toast.error(formError);
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
				role_id: formData.role_id,
				phone: formData.phone || null,
				date_of_birth: formData.date_of_birth || null,
				country: formData.country || null,
				department: formData.department || null,
				municipality: formData.municipality || null,
				address_complement: formData.address_complement || null
			};
			await updateUser(editingUser.id, data);
			toast.success('Usuario actualizado con éxito');
			closeModals();
			await load(page);
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al actualizar usuario';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	async function handleDeactivate(u: User) {
		if (!confirm(`¿Desactivar a ${displayName(u)}?`)) return;
		try {
			await deactivateUser(u.id);
			toast.success(`Usuario ${u.email} desactivado`);
			await load(page);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Error al desactivar';
			toast.error(msg);
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

<svelte:head>
	<title>Admin - Usuarios</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Usuarios</h1>
			<p class="admin-desc">Gestiona los usuarios del sistema y sus perfiles.</p>
		</div>
		<div class="admin-toolbar flex-wrap">
			<div class="flex flex-1 gap-3 items-center min-w-[250px]">
				<div class="relative flex-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input type="text" placeholder="Buscar por nombre o correo..." bind:value={searchQuery} class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter']" />
				</div>
				<select bind:value={selectedRole} class="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter']">
					<option value="">Todos los roles</option>
					{#each roles as r}
						<option value={r.name}>{r.name}</option>
					{/each}
				</select>
			</div>
			{#if hasPermission($authStore.user, 'users', 'create')}
				<button type="button" class="admin-btn" onclick={openCreate}>Crear Usuario</button>
			{/if}
		</div>
	</div>

	{#if loading}
		<p class="admin-loading">Cargando...</p>
	{:else if error}
		<div class="admin-error" role="alert">{error}</div>
	{:else}
		<section class="admin-section">
			<div class="admin-table-wrapper">
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
						{#if filteredUsers.length === 0}
							<tr>
								<td colspan="5" class="text-center py-6 text-slate-500">No se encontraron usuarios.</td>
							</tr>
						{:else}
							{#each filteredUsers as u}
								<tr>
								<td>{displayName(u)}</td>
								<td>{u.email}</td>
								<td><span class="admin-badge">{rolesLabel(u)}</span></td>
								<td>
									{#if u.is_active}
										<span class="admin-badge">Activo</span>
									{:else}
										<span class="admin-badge-inactive">Inactivo</span>
									{/if}
								</td>
								<td>
									<div class="flex items-center gap-1">
										<button
											class="action-icon-btn"
											onclick={() => viewingUser = u}
											title="Ver Detalles"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
										</button>
										{#if u.is_active}
											{#if hasPermission($authStore.user, 'users', 'update')}
												<button
													class="action-icon-btn"
													onclick={() => openEdit(u)}
													title="Editar"
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
												</button>
											{/if}
											{#if hasPermission($authStore.user, 'users', 'delete') && u.id !== $authStore.user?.id}
												<button
													class="action-icon-btn danger"
													onclick={() => handleDeactivate(u)}
													title="Desactivar"
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
												</button>
											{/if}
										{/if}
									</div>
								</td>
							</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {filteredUsers.length} usuario(s)</span>
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
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
						<label for="create-phone">Celular</label>
						<input id="create-phone" type="tel" bind:value={formData.phone} placeholder="+503..." />
					</div>
					<div class="admin-field">
						<label for="create-dob">Fecha Nacimiento (+18)</label>
						<input id="create-dob" type="date" bind:value={formData.date_of_birth} max={maxDobString} />
					</div>
					<div class="admin-field">
						<label for="create-country">País</label>
						<select id="create-country" bind:value={formData.country}>
							<option value="">-- Seleccionar --</option>
							{#each countries as c}
								<option value={c.isoCode}>{c.name}</option>
							{/each}
						</select>
					</div>
					<div class="admin-field">
						<label for="create-dept">Departamento</label>
						<select id="create-dept" bind:value={formData.department} disabled={!departments.length}>
							<option value="">-- Seleccionar --</option>
							{#each departments as d}
								<option value={d.isoCode}>{d.name}</option>
							{/each}
						</select>
					</div>
					<div class="admin-field">
						<label for="create-muni">Municipio</label>
						<select id="create-muni" bind:value={formData.municipality} disabled={!municipalities.length}>
							<option value="">-- Seleccionar --</option>
							{#each municipalities as m}
								<option value={m.name}>{m.name}</option>
							{/each}
						</select>
					</div>
					<div class="admin-field">
						<label for="create-complement">Complemento Dirección</label>
						<input id="create-complement" type="text" bind:value={formData.address_complement} placeholder="Colonia, casa..." />
					</div>
					<div class="admin-field md:col-span-2">
						<label for="create-role">Rol</label>
						<select id="create-role" bind:value={formData.role_id}>
							{#each roles as r}
								<option value={r.id}>{r.name}</option>
							{/each}
						</select>
					</div>
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
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
						<label for="edit-phone">Celular</label>
						<input id="edit-phone" type="tel" bind:value={formData.phone} placeholder="+503..." />
					</div>
					<div class="admin-field">
						<label for="edit-dob">Fecha Nacimiento (+18)</label>
						<input id="edit-dob" type="date" bind:value={formData.date_of_birth} max={maxDobString} />
					</div>
					<div class="admin-field md:col-span-2 hidden md:block"></div>
					<div class="admin-field">
						<label for="edit-country">País</label>
						<select id="edit-country" bind:value={formData.country}>
							<option value="">-- Seleccionar --</option>
							{#each countries as c}
								<option value={c.isoCode}>{c.name}</option>
							{/each}
						</select>
					</div>
					<div class="admin-field">
						<label for="edit-dept">Departamento</label>
						<select id="edit-dept" bind:value={formData.department} disabled={!departments.length}>
							<option value="">-- Seleccionar --</option>
							{#each departments as d}
								<option value={d.isoCode}>{d.name}</option>
							{/each}
						</select>
					</div>
					<div class="admin-field">
						<label for="edit-muni">Municipio</label>
						<select id="edit-muni" bind:value={formData.municipality} disabled={!municipalities.length}>
							<option value="">-- Seleccionar --</option>
							{#each municipalities as m}
								<option value={m.name}>{m.name}</option>
							{/each}
						</select>
					</div>
					<div class="admin-field">
						<label for="edit-complement">Complemento Dirección</label>
						<input id="edit-complement" type="text" bind:value={formData.address_complement} placeholder="Colonia, casa..." />
					</div>
					<div class="admin-field md:col-span-2">
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

{#if viewingUser}
	<UserDetailModal user={viewingUser} onClose={() => viewingUser = null} />
{/if}
{/if}

