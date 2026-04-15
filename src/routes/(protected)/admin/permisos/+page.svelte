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
	import '../adminPage.css';

	let resources = $state<string[]>([]);
	let actions = $state<string[]>([]);
	let policies = $state<PolicyRead[]>([]);
	let roles = $state<RoleRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreate = $state(false);
	let formData = $state({ sub: '', obj: '', act: '' });
	let formError = $state<string | null>(null);
	let formLoading = $state(false);
	
	let showResourceModal = $state(false);
	let newResourceName = $state('');
	let resourceLoading = $state(false);
let page = $state(1);
let pageSize = $state(100);
let hasNextPage = $state(false);

let hasAccess = $derived(hasPermission($authStore.user, 'permissions', 'read'));

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
		if (!confirm(`¿Eliminar el recurso "${resName}"? Esto eliminará todas las políticas asociadas en Casbin.`)) return;
		try {
			await deletePermissionResource(resName);
			toast.success(`Recurso "${resName}" eliminado`);
			const metadata = await fetchPermissionsMetadata();
			resources = metadata.resources;
			await load(page);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Error al eliminar recurso');
		}
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
		if (!confirm(`¿Eliminar la política ${p.sub} -> ${p.obj} / ${p.act}?`)) return;
		try {
			await deletePolicy(p.sub, p.obj, p.act);
			toast.success('Política eliminada');
			await load(page);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Error al eliminar');
		}
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'permissions', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load(1);
	});
</script>

{#if hasAccess}
<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Permisos</h1>
			<p class="admin-desc">
				Define qué acción puede realizar cada rol sobre cada recurso. Solo se pueden asignar permisos a roles existentes.
			</p>
		</div>
		<div class="admin-toolbar flex-col sm:flex-row w-full sm:w-auto">
			{#if hasPermission($authStore.user, 'permissions', 'create')}
				<button type="button" class="admin-btn w-full sm:w-auto" onclick={openCreate} disabled={roles.length === 0}>
					Nueva Política
				</button>
			{/if}
			<button type="button" class="admin-btn-secondary w-full sm:w-auto mt-2 sm:mt-0" onclick={openResourceModal}>
				Gestionar Recursos
			</button>
			{#if roles.length === 0}
				<span class="admin-hint text-center sm:text-left mt-2 sm:mt-0 w-full sm:w-auto">Crea al menos un rol antes de agregar políticas.</span>
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
						<th>Rol (sub)</th>
						<th>Recurso (obj)</th>
						<th>Acción (act)</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each policies as p}
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
					<span>Mostrando {policies.length} política(s)</span>
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
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal">
			<h2 class="admin-modal-title">Nueva política de permiso</h2>
			<form onsubmit={handleCreate}>
				{#if formError}
					<div class="admin-error mb-4">{formError}</div>
				{/if}
				<div class="admin-field">
					<label for="policy-sub">Rol (sub)</label>
					<select id="policy-sub" bind:value={formData.sub} required>
						<option value="" disabled>Selecciona un rol</option>
						{#each roles as r}
							<option value={r.name}>{r.name}{r.description ? ` — ${r.description}` : ''}</option>
						{/each}
					</select>
				</div>
				<div class="admin-field">
					<label for="policy-obj">Recurso (obj)</label>
					<select id="policy-obj" bind:value={formData.obj} required>
						{#each resources as res}
							<option value={res}>{res}</option>
						{/each}
					</select>
				</div>
				<div class="admin-field">
					<label for="policy-act">Acción (act)</label>
					<select id="policy-act" bind:value={formData.act} required>
						{#each actions as a}
							<option value={a}>{a}</option>
						{/each}
					</select>
				</div>
				<div class="admin-modal-actions">
					<button type="button" class="admin-btn-secondary" onclick={closeModal}>Cancelar</button>
					<button type="submit" class="admin-btn" disabled={formLoading}>
						{formLoading ? 'Guardando...' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showResourceModal}
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal max-w-lg">
			<h2 class="admin-modal-title">Gestión de Recursos</h2>
			<p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Administra los recursos sobre los que se aplican los permisos.</p>
			
			<div class="mb-6 max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
				{#if resources.length === 0}
					<p class="text-sm text-slate-500 p-2">No hay recursos disponibles.</p>
				{:else}
					<ul class="space-y-1">
						{#each resources as res}
							<li class="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded">
								<span class="font-medium text-slate-700 dark:text-slate-200">{res}</span>
								{#if res !== '*'}
									<button type="button" class="text-red-500 hover:text-red-700 text-sm font-bold px-2 py-1" onclick={() => handleDeleteResource(res)}>
										Eliminar
									</button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<form onsubmit={handleCreateResource}>
				{#if formError}
					<div class="admin-error mb-4">{formError}</div>
				{/if}
				<div class="admin-field">
					<label for="new-resource">Agregar nuevo recurso</label>
					<div class="flex gap-2">
						<input id="new-resource" type="text" bind:value={newResourceName} placeholder="Ej. reportes" class="flex-1" required />
						<button type="submit" class="admin-btn whitespace-nowrap" disabled={resourceLoading}>
							{resourceLoading ? '...' : 'Añadir'}
						</button>
					</div>
				</div>
				<div class="admin-modal-actions mt-6">
					<button type="button" class="admin-btn-secondary w-full" onclick={() => showResourceModal = false}>Cerrar</button>
				</div>
			</form>
		</div>
	</div>
{/if}
{/if}
