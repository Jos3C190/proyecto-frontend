<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import {
		fetchPolicies,
		fetchRoles,
		fetchPermissionsMetadata,
		createPolicy,
		deletePolicy,
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
let page = $state(1);
let pageSize = $state(100);
let hasNextPage = $state(false);

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
			closeModal();
			await load(page);
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al crear política';
		} finally {
			formLoading = false;
		}
	}

	async function handleDelete(p: PolicyRead) {
		if (!confirm(`¿Eliminar la política ${p.sub} -> ${p.obj} / ${p.act}?`)) return;
		try {
			await deletePolicy(p.sub, p.obj, p.act);
			await load(page);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar';
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

<div class="admin-page">
	<h1 class="admin-title">Permisos</h1>
	<p class="admin-desc">
		Define qué acción puede realizar cada rol sobre cada recurso. Solo se pueden asignar permisos a roles existentes.
	</p>

	<div class="admin-toolbar">
		{#if hasPermission($authStore.user, 'permissions', 'create')}
			<button type="button" class="admin-btn" onclick={openCreate} disabled={roles.length === 0}>
				Nueva política
			</button>
		{/if}
		{#if roles.length === 0}
			<span class="admin-hint">Crea al menos un rol antes de agregar políticas.</span>
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
								{#if hasPermission($authStore.user, 'permissions', 'delete')}
									<button type="button" class="admin-btn-danger" onclick={() => handleDelete(p)}>
										Eliminar
									</button>
								{/if}
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
