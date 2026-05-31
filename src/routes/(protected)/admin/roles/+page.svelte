<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import {
		fetchRoles,
		createRole,
		updateRole,
		deleteRole,
		type RoleCreate,
		type RoleUpdate
	} from '$lib/services/admin.service';
	import type { RoleRead } from '$lib/types';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import { X, Save } from 'lucide-svelte';
	import '../adminPage.css';

	const persistence = createPersistence({
		key: 'admin_roles',
		defaultValues: {
			page: 1,
			pageSize: 10,
			searchQuery: ''
		}
	});

	const initialState = persistence.getInitialState();

	let roles = $state<RoleRead[]>([]);
	let loading = $state(true);
	let isDeleteModalOpen = $state(false);
	let roleToDelete = $state<RoleRead | null>(null);
	let actionLoading = $state(false);
	let error = $state<string | null>(null);
	let showCreate = $state(false);
	let editingRole = $state<RoleRead | null>(null);
	let formData = $state({ name: '', description: '' });
	let formError = $state<string | null>(null);
	let formLoading = $state(false);

	let page = $state(initialState.page);
	let pageSize = $state(initialState.pageSize);
	let searchQuery = $state(initialState.searchQuery);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			page,
			pageSize,
			searchQuery
		});
	});

	let hasAccess = $derived(hasPermission($authStore.user, 'roles', 'read'));

	let filteredRoles = $derived(
		roles.filter((r) => {
			const query = searchQuery.toLowerCase().trim();
			return (
				query === '' ||
				r.name.toLowerCase().includes(query) ||
				(r.description && r.description.toLowerCase().includes(query))
			);
		})
	);

	// Pagination
	let paginatedRoles = $derived(filteredRoles.slice((page - 1) * pageSize, page * pageSize));
	let totalPages = $derived(Math.ceil(filteredRoles.length / pageSize) || 1);
	let hasNextPage = $derived(page < totalPages);
	let hasPrevPage = $derived(page > 1);

	function nextPage() { if (hasNextPage) page++; }
	function prevPage() { if (hasPrevPage) page--; }
	function setPageSize(e: Event) {
		const v = Number((e.currentTarget as HTMLSelectElement).value);
		if (!Number.isFinite(v) || v <= 0) return;
		pageSize = v;
		page = 1;
	}

	async function load() {
		try {
			roles = await fetchRoles();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error de conexión';
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		formData = { name: '', description: '' };
		formError = null;
		showCreate = true;
	}

	function openEdit(r: RoleRead) {
		editingRole = r;
		formData = { name: r.name, description: r.description ?? '' };
		formError = null;
	}

	function closeModals() {
		showCreate = false;
		editingRole = null;
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		formError = null;
		if (!formData.name.trim()) {
			formError = 'El nombre es obligatorio.';
			return;
		}
		formLoading = true;
		try {
			const data: RoleCreate = {
				name: formData.name.trim(),
				description: formData.description.trim() || null
			};
			await createRole(data);
			toast.success(`Rol "${data.name}" creado`);
			closeModals();
			await load();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al crear rol';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	async function handleUpdate(e: Event) {
		e.preventDefault();
		if (!editingRole) return;
		formError = null;
		if (!formData.name.trim()) {
			formError = 'El nombre es obligatorio.';
			return;
		}
		formLoading = true;
		try {
			const data: RoleUpdate = {
				name: formData.name.trim(),
				description: formData.description.trim() || null
			};
			await updateRole(editingRole.id, data);
			toast.success(`Rol "${data.name}" actualizado`);
			closeModals();
			await load();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al actualizar rol';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	async function handleDelete(r: RoleRead) {
		roleToDelete = r;
		isDeleteModalOpen = true;
	}

	async function confirmDelete() {
		if (!roleToDelete) return;
		actionLoading = true;
		try {
			await deleteRole(roleToDelete.id);
			toast.success(`Rol "${roleToDelete.name}" eliminado`);
			isDeleteModalOpen = false;
			await load();
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Error al eliminar rol';
			toast.error(msg);
		} finally {
			actionLoading = false;
		}
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'roles', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load();
	});
</script>

<svelte:head>
	<title>Admin - Roles</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Roles</h1>
			<p class="admin-desc">Crea y edita roles. Asigna permisos desde la sección Permisos.</p>
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
				<input type="text" placeholder="Buscar rol..." bind:value={searchQuery} oninput={() => page = 1} />
			</div>

			{#if hasPermission($authStore.user, 'roles', 'create')}
				<button type="button" class="admin-btn" onclick={openCreate}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg
					>
					Crear Rol</button
				>
			{/if}
		</div>
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
						<th>Descripción</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each paginatedRoles as r}
						<tr>
							<td><span class="admin-badge">{r.name}</span></td>
							<td>{r.description ?? '—'}</td>
							<td>
								<div class="flex items-center gap-2">
									{#if r.name === 'admin' || r.name === 'cliente'}
										<span class="admin-badge-system">Sistema</span>
									{:else}
										{#if hasPermission($authStore.user, 'roles', 'update')}
											<button
												class="action-icon-btn"
												onclick={() => openEdit(r)}
												title="Editar"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
											</button>
										{/if}
										{#if hasPermission($authStore.user, 'roles', 'delete')}
											<button
												class="action-icon-btn danger"
												onclick={() => handleDelete(r)}
												title="Eliminar"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
											</button>
										{/if}
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {filteredRoles.length} rol(es)</span>
					<div class="admin-page-size">
						<label for="page-size-roles" class="text-sm">Filas:</label>
						<select id="page-size-roles" value={pageSize} onchange={setPageSize}>
							<option value="10">10</option>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</select>
					</div>
				</div>

				<div class="admin-pagination-right">
					<button class="admin-btn-secondary" onclick={prevPage} disabled={!hasPrevPage}>
						Anterior
					</button>
					<span class="admin-pagination-info">Página {page} de {totalPages}</span>
					<button class="admin-btn-secondary" onclick={nextPage} disabled={!hasNextPage}>
						Siguiente
					</button>
				</div>
			</div>
		</section>
	{/if}
</div>

{#if showCreate}
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={closeModals}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Crear Rol</h2>
					<p class="text-xs text-gray-500 mt-1">Configura un nuevo rol de usuario para la asignación de permisos.</p>
				</div>
				<button onclick={closeModals} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Body -->
			<form onsubmit={handleCreate} class="flex flex-col flex-1 overflow-hidden">
				<div class="p-6 overflow-y-auto flex-1 space-y-5">
					{#if formError}
						<div class="admin-error mb-4">{formError}</div>
					{/if}
					
					<div class="admin-field">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5" for="create-role-name">Nombre <span class="text-red-500">*</span></label>
						<input id="create-role-name" type="text" bind:value={formData.name} placeholder="ej. editor" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all placeholder-gray-400" required />
					</div>
					
					<div class="admin-field">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5" for="create-role-desc">Descripción</label>
						<textarea id="create-role-desc" bind:value={formData.description} placeholder="Describe el propósito del rol..." rows="3" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all resize-none placeholder-gray-400"></textarea>
					</div>
				</div>

				<!-- Footer -->
				<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
					<button type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors" onclick={closeModals}>
						Cancelar
					</button>
					<button type="submit" class="px-5 py-2.5 bg-[#D4AF37] hover:from-[#f3cd54] hover:to-[#c69a2b] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2" disabled={formLoading}>
						{#if formLoading}
							<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
						{:else}
							<Save class="w-4 h-4" />
						{/if}
						{formLoading ? 'Guardando...' : 'Crear Rol'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if editingRole}
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={closeModals}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Editar Rol</h2>
					<p class="text-xs text-gray-500 mt-1">Modifica el nombre y descripción del rol seleccionado.</p>
				</div>
				<button onclick={closeModals} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Body -->
			<form onsubmit={handleUpdate} class="flex flex-col flex-1 overflow-hidden">
				<div class="p-6 overflow-y-auto flex-1 space-y-5">
					{#if formError}
						<div class="admin-error mb-4">{formError}</div>
					{/if}
					
					<div class="admin-field">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5" for="edit-role-name">Nombre <span class="text-red-500">*</span></label>
						<input id="edit-role-name" type="text" bind:value={formData.name} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all" required />
					</div>
					
					<div class="admin-field">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5" for="edit-role-desc">Descripción</label>
						<textarea id="edit-role-desc" bind:value={formData.description} rows="3" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all resize-none"></textarea>
					</div>
				</div>

				<!-- Footer -->
				<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
					<button type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors" onclick={closeModals}>
						Cancelar
					</button>
					<button type="submit" class="px-5 py-2.5 bg-[#D4AF37] hover:from-[#f3cd54] hover:to-[#c69a2b] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2" disabled={formLoading}>
						{#if formLoading}
							<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
						{:else}
							<Save class="w-4 h-4" />
						{/if}
						{formLoading ? 'Guardando...' : 'Guardar Cambios'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
{/if}

<GenericConfirmModal
	isOpen={isDeleteModalOpen}
	title="Eliminar Rol"
	message="¿Estás seguro de que deseas eliminar el rol &quot;{roleToDelete?.name}&quot;? Los usuarios con este rol deberán ser reasignados manualmente antes de que el cambio surta efecto completo."
	confirmText="Eliminar"
	variant="danger"
	onConfirm={confirmDelete}
	onClose={() => (isDeleteModalOpen = false)}
	loading={actionLoading}
/>
