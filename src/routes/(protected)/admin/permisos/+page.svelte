<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import {
		fetchPolicies,
		fetchRoles,
		fetchPermissionsMetadata,
		createPolicy,
		deletePolicy,
		createPermissionResource,
		deletePermissionResource,
		type PolicyCreate
	} from '$lib/services/admin.service';
	import type { PolicyRead } from '$lib/services/admin.service';
	import type { RoleRead } from '$lib/types';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import { X, Save, Plus, Trash2 } from 'lucide-svelte';
	import '../adminPage.css';

	const persistence = createPersistence({
		key: 'admin_permissions',
		defaultValues: {
			page: 1,
			pageSize: 100,
			searchQuery: ''
		}
	});

	const initialState = persistence.getInitialState();

	let resources = $state<string[]>([]);
	let actions = $state<string[]>([]);
	let policies = $state<PolicyRead[]>([]);
	let roles = $state<RoleRead[]>([]);
	let loading = $state(true);
	let isConfirmModalOpen = $state(false);
	let modalConfig = $state<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);
	let actionLoading = $state(false);
	let error = $state<string | null>(null);
	let showCreate = $state(false);
	let formData = $state({ sub: '', obj: '', act: '' });
	let formError = $state<string | null>(null);
	let formLoading = $state(false);
	
	let showResourceModal = $state(false);
	let newResourceName = $state('');
	let resourceLoading = $state(false);

	let page = $state(initialState.page);
	let pageSize = $state(initialState.pageSize);
	let searchQuery = $state(initialState.searchQuery);

	let hasNextPage = $state(false);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			page,
			pageSize,
			searchQuery
		});
	});

	let hasAccess = $derived(hasPermission($authStore.user, 'permissions', 'read'));
let filteredPolicies = $derived(
	policies.filter((p) => {
		const query = searchQuery.toLowerCase().trim();
		return (
			query === '' ||
			p.sub.toLowerCase().includes(query) ||
			p.obj.toLowerCase().includes(query) ||
			p.act.toLowerCase().includes(query)
		);
	})
);

async function load(targetPage?: number) {
	loading = true;
		try {
		const currentPage = targetPage ?? page;
		const offset = (currentPage - 1) * pageSize;

		const [rawPolicies, loadedRoles, metadata] = await Promise.all([
			fetchPolicies({ limit: pageSize + 1, offset }),
			fetchRoles(),
			fetchPermissionsMetadata()
		]);

		policies = rawPolicies.slice(0, pageSize);
		roles = loadedRoles;
		resources = metadata.resources;
		actions = metadata.actions;
		hasNextPage = rawPolicies.length > pageSize;
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
			sub: roles[0]?.name ?? '',
			obj: resources[0] ?? '',
			act: actions[0] ?? ''
		};
		formError = null;
		showCreate = true;
	}

	function closeModal() {
		showCreate = false;
	}

	function openResourceModal() {
		showResourceModal = true;
		newResourceName = '';
		formError = null;
	}

	async function handleCreateResource(e: Event) {
		e.preventDefault();
		formError = null;
		if (!newResourceName.trim()) {
			formError = 'El nombre del recurso es requerido.';
			return;
		}
		resourceLoading = true;
		try {
			await createPermissionResource(newResourceName.trim());
			toast.success(`Recurso "${newResourceName}" creado`);
			const metadata = await fetchPermissionsMetadata();
			resources = metadata.resources;
			newResourceName = '';
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al crear recurso';
			toast.error(formError);
		} finally {
			resourceLoading = false;
		}
	}

	async function handleDeleteResource(resName: string) {
		if (resName === '*') {
			toast.warning('No puedes eliminar el comodín (*).');
			return;
		}
		
		modalConfig = {
			title: 'Eliminar Recurso',
			message: `¿Estás seguro de que deseas eliminar el recurso "${resName}"? Esto eliminará todas las políticas asociadas en Casbin.`,
			onConfirm: async () => {
				actionLoading = true;
				try {
					await deletePermissionResource(resName);
					toast.success(`Recurso "${resName}" eliminado`);
					const metadata = await fetchPermissionsMetadata();
					resources = metadata.resources;
					isConfirmModalOpen = false;
					await load(page);
				} catch (e) {
					toast.error(e instanceof Error ? e.message : 'Error al eliminar recurso');
				} finally {
					actionLoading = false;
				}
			}
		};
		isConfirmModalOpen = true;
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		formError = null;
		if (!formData.sub || !formData.obj || !formData.act) {
			formError = 'Selecciona rol, recurso y acción.';
			return;
		}
		formLoading = true;
		try {
			const data: PolicyCreate = {
				sub: formData.sub,
				obj: formData.obj,
				act: formData.act
			};
			await createPolicy(data);
			toast.success('Política creada con éxito');
			closeModal();
			await load(page);
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al crear política';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	async function handleDelete(p: PolicyRead) {
		modalConfig = {
			title: 'Eliminar Política',
			message: `¿Estás seguro de que deseas eliminar la política ${p.sub} -> ${p.obj} / ${p.act}?`,
			onConfirm: async () => {
				actionLoading = true;
				try {
					await deletePolicy(p.sub, p.obj, p.act);
					toast.success('Política eliminada');
					isConfirmModalOpen = false;
					await load(page);
				} catch (e) {
					toast.error(e instanceof Error ? e.message : 'Error al eliminar');
				} finally {
					actionLoading = false;
				}
			}
		};
		isConfirmModalOpen = true;
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'permissions', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load(page);
	});
</script>

<svelte:head>
	<title>Admin - Permisos</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Permisos</h1>
			<p class="admin-desc">
				Define qué acción puede realizar cada rol sobre cada recurso. Solo se pueden asignar permisos a roles existentes.
			</p>
		</div>
		<div class="admin-toolbar flex-col sm:flex-row w-full sm:w-auto gap-3">
			<div class="admin-search-wrapper w-full sm:w-64">
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
				<input type="text" placeholder="Buscar permiso..." bind:value={searchQuery} oninput={() => page = 1} />
			</div>

			<div class="flex flex-wrap items-center gap-2">
				{#if hasPermission($authStore.user, 'permissions', 'create')}
					<button type="button" class="admin-btn w-full sm:w-auto" onclick={openCreate} disabled={roles.length === 0}>
						Nueva Política
					</button>
				{/if}
				<button type="button" class="admin-btn-secondary w-full sm:w-auto" onclick={openResourceModal}>
					Gestionar Recursos
				</button>
			</div>
			
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
						<th>Rol (sub)</th>
						<th>Recurso (obj)</th>
						<th>Acción (act)</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredPolicies as p}
						<tr>
							<td><span class="admin-badge">{p.sub}</span></td>
							<td>{p.obj}</td>
							<td>{p.act}</td>
							<td>
								<div class="flex items-center gap-1">
									{#if hasPermission($authStore.user, 'permissions', 'delete')}
										<button
											class="action-icon-btn danger"
											onclick={() => handleDelete(p)}
											title="Eliminar"
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {filteredPolicies.length} política(s)</span>
					<div class="admin-page-size">
						<label for="page-size-permisos" class="text-sm">Filas:</label>
						<select id="page-size-permisos" value={pageSize} onchange={setPageSize}>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
							<option value="200">200</option>
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
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={closeModal}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Nueva Política de Permiso</h2>
					<p class="text-xs text-gray-500 mt-1">Configura una regla de control de acceso para roles, recursos y acciones.</p>
				</div>
				<button onclick={closeModal} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
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
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5" for="policy-sub">Rol (sub) <span class="text-red-500">*</span></label>
						<select id="policy-sub" bind:value={formData.sub} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all font-bold" required>
							<option value="" disabled>Selecciona un rol</option>
							{#each roles as r}
								<option value={r.name}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
							{/each}
						</select>
					</div>

					<div class="admin-field">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5" for="policy-obj">Recurso (obj) <span class="text-red-500">*</span></label>
						<select id="policy-obj" bind:value={formData.obj} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all font-bold" required>
							{#each resources as res}
								<option value={res}>{res}</option>
							{/each}
						</select>
					</div>

					<div class="admin-field">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5" for="policy-act">Acción (act) <span class="text-red-500">*</span></label>
						<select id="policy-act" bind:value={formData.act} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all font-bold" required>
							{#each actions as a}
								<option value={a}>{a}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Footer -->
				<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
					<button type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors" onclick={closeModal}>
						Cancelar
					</button>
					<button type="submit" class="px-5 py-2.5 bg-[#D4AF37] hover:from-[#f3cd54] hover:to-[#c69a2b] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2" disabled={formLoading}>
						{#if formLoading}
							<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
						{:else}
							<Save class="w-4 h-4" />
						{/if}
						{formLoading ? 'Guardando...' : 'Crear Política'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showResourceModal}
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={() => showResourceModal = false}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Gestión de Recursos</h2>
					<p class="text-xs text-gray-500 mt-1">Administra los recursos lógicos sobre los que se aplican las políticas.</p>
				</div>
				<button onclick={() => showResourceModal = false} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Add Resource Form -->
			<div class="p-6 bg-gray-50/30 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
				<form onsubmit={handleCreateResource} class="flex flex-col sm:flex-row gap-3 items-end">
					<div class="w-full sm:flex-1">
						<label class="text-[10px] font-black text-gray-400 mb-1.5 block uppercase tracking-wider" for="new-resource">Agregar Recurso <span class="text-red-500">*</span></label>
						<input id="new-resource" type="text" bind:value={newResourceName} placeholder="Ej. reportes, clientes" class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all placeholder-gray-400" required disabled={resourceLoading} />
					</div>
					<button type="submit" class="w-full sm:w-auto px-5 py-2.5 bg-[#D4AF37] hover:from-[#f3cd54] hover:to-[#c69a2b] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shrink-0" disabled={resourceLoading}>
						<Plus class="w-4 h-4" />
						Añadir
					</button>
				</form>
				{#if formError}
					<div class="admin-error mt-3">{formError}</div>
				{/if}
			</div>

			<!-- List -->
			<div class="p-6 overflow-y-auto flex-1">
				{#if resources.length === 0}
					<div class="text-center p-8 text-gray-500 text-sm font-medium">
						No hay recursos registrados.
					</div>
				{:else}
					<div class="space-y-2">
						{#each resources as res}
							<div class="flex items-center justify-between p-3.5 bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl group hover:border-[#D4AF37]/30 transition-colors">
								<span class="text-sm font-bold text-slate-700 dark:text-gray-200 pl-1">{res}</span>
								{#if res !== '*'}
									<button type="button" class="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all" onclick={() => handleDeleteResource(res)} title="Eliminar recurso">
										<Trash2 class="w-4 h-4" />
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" onclick={() => showResourceModal = false} class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-bold rounded-xl transition-colors">
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}
{/if}

<GenericConfirmModal
	isOpen={isConfirmModalOpen}
	title={modalConfig?.title || 'Confirmar Acción'}
	message={modalConfig?.message || ''}
	confirmText="Eliminar"
	variant="danger"
	onConfirm={() => modalConfig?.onConfirm()}
	onClose={() => (isConfirmModalOpen = false)}
	loading={actionLoading}
/>
