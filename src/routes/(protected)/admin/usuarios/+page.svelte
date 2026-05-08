<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import {
		fetchUsers,
		fetchRoles,
		deactivateUser
	} from '$lib/services/admin.service';
	import type { User, RoleRead } from '$lib/types';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import '../adminPage.css';

	const persistence = createPersistence({
		key: 'admin_users',
		defaultValues: {
			page: 1,
			pageSize: 50,
			searchQuery: '',
			selectedRole: ''
		}
	});

	const initialState = persistence.getInitialState();

	let users = $state<User[]>([]);
	let roles = $state<RoleRead[]>([]);
	let loading = $state(true);
	let isConfirmModalOpen = $state(false);
	let userToDeactivate = $state<User | null>(null);
	let actionLoading = $state(false);
	let error = $state<string | null>(null);
	
	let page = $state(initialState.page);
	let pageSize = $state(initialState.pageSize);
	let searchQuery = $state(initialState.searchQuery);
	let selectedRole = $state(initialState.selectedRole);

	let hasNextPage = $state(false);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			page,
			pageSize,
			searchQuery,
			selectedRole
		});
	});

	let hasAccess = $derived(hasPermission($authStore.user, 'users', 'read'));

	let filteredUsers = $derived(
		users.filter((u) => {
			const search = searchQuery.toLowerCase().trim();
			const matchesSearch =
				search === '' ||
				(u.email && u.email.toLowerCase().includes(search)) ||
				u.profile?.first_name?.toLowerCase().includes(search) ||
				u.profile?.last_name?.toLowerCase().includes(search);

			const matchesRole =
				selectedRole === '' || (u.roles && u.roles.some((r) => r.name === selectedRole));
			return matchesSearch && matchesRole;
		})
	);

	function displayName(u: User): string {
		const p = u.profile;
		if (p?.person_type === 'Juridica' && p.business_name) {
			return p.business_name;
		}
		if (p?.first_name?.trim() || p?.last_name?.trim()) {
			return `${p.first_name?.trim() || ''} ${p.last_name === 'N/A' ? '' : p.last_name?.trim() || ''}`.trim();
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

	async function handleDeactivate(u: User) {
		userToDeactivate = u;
		isConfirmModalOpen = true;
	}

	async function confirmDeactivation() {
		if (!userToDeactivate) return;
		actionLoading = true;
		try {
			await deactivateUser(userToDeactivate.id);
			toast.success(`Usuario ${userToDeactivate.email} desactivado`);
			isConfirmModalOpen = false;
			await load(page);
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Error al desactivar';
			toast.error(msg);
		} finally {
			actionLoading = false;
		}
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'users', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load(page);
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
				<p class="admin-desc">Gestión de personal administrativo y roles del sistema.</p>
			</div>
			<div class="admin-toolbar">
				<div class="admin-search-wrapper">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg
					>
					<input type="text" placeholder="Buscar por nombre o correo..." bind:value={searchQuery} />
				</div>

				<div class="flex flex-wrap items-center gap-3">
					<div class="admin-filters">
						<select bind:value={selectedRole} class="admin-select !min-w-[160px]">
							<option value="">Todos los Roles</option>
							{#each roles as r}
								<option value={r.name}>{r.name}</option>
							{/each}
						</select>
					</div>

					{#if hasPermission($authStore.user, 'users', 'create')}
						<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
						<a href="/admin/usuarios/nuevo" class="admin-btn">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="shrink-0"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg
							>
							NUEVO USUARIO
						</a>
					{/if}
				</div>
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
								<th>Correo</th>
								<th>Rol</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#if filteredUsers.length === 0}
								<tr>
									<td colspan="5" class="text-center py-6 text-slate-500"
										>No se encontraron usuarios.</td
									>
								</tr>
							{:else}
								{#each filteredUsers as u}
									<tr>
										<td>
											<div class="flex items-center gap-3">
												<div
													class="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-black text-[10px]"
												>
													{u.profile?.first_name?.charAt(0) || u.email?.charAt(0)}
												</div>
												<span class="font-medium text-slate-900 dark:text-slate-100"
													>{displayName(u)}</span
												>
											</div>
										</td>
										<td>{u.email}</td>
										<td>
											<span class="text-xs font-bold text-slate-600 dark:text-slate-400">
												{rolesLabel(u)}
											</span>
										</td>
										<td>
											<span
												class="admin-badge {u.is_active
													? 'bg-emerald-50 text-emerald-600'
													: 'bg-rose-50 text-rose-600'}"
											>
												{u.is_active ? 'Activo' : 'Inactivo'}
											</span>
										</td>
										<td>
											<div class="flex items-center gap-1">
												<a href="/admin/usuarios/{u.id}" class="action-icon-btn" title="Ver Perfil">
													<svg
														xmlns="http://www.w3.org/2000/svg"
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="2"
														stroke-linecap="round"
														stroke-linejoin="round"
														><path
															d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
														/><circle cx="12" cy="12" r="3" /></svg
													>
												</a>
												{#if u.is_active}
													{#if hasPermission($authStore.user, 'users', 'update')}
														<a
															href="/admin/usuarios/{u.id}/editar"
															class="action-icon-btn"
															title="Editar"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																width="16"
																height="16"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2"
																stroke-linecap="round"
																stroke-linejoin="round"
																><path
																	d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
																/><path
																	d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
																/></svg
															>
														</a>
													{/if}
													{#if hasPermission($authStore.user, 'users', 'delete') && u.id !== $authStore.user?.id}
														<button
															class="action-icon-btn danger"
															onclick={() => handleDeactivate(u)}
															title="Desactivar"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																width="16"
																height="16"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="2"
																stroke-linecap="round"
																stroke-linejoin="round"
																><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line
																	x1="12"
																	y1="2"
																	x2="12"
																	y2="12"
																/></svg
															>
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
						<button
							type="button"
							class="admin-btn-secondary"
							onclick={prevPage}
							disabled={loading || page === 1}
						>
							Anterior
						</button>
						<span class="admin-pagination-info">Página {page}</span>
						<button
							type="button"
							class="admin-btn-secondary"
							onclick={nextPage}
							disabled={loading || !hasNextPage}
						>
							Siguiente
						</button>
					</div>
				</div>
			</section>
		{/if}
	</div>
{/if}

<GenericConfirmModal
	isOpen={isConfirmModalOpen}
	title="Desactivar Usuario"
	message="¿Estás seguro de que deseas desactivar a {userToDeactivate ? displayName(userToDeactivate) : ''}? El usuario ya no podrá acceder al sistema."
	confirmText="Desactivar"
	variant="danger"
	onConfirm={confirmDeactivation}
	onClose={() => (isConfirmModalOpen = false)}
	loading={actionLoading}
/>
