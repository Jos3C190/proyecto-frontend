<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { fetchAuditLogs } from '$lib/services/admin.service';
	import type { AuditLogRead } from '$lib/services/admin.service';
	import AuditLogDetailModal from '$lib/components/ui/AuditLogDetailModal.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import '../adminPage.css';

	const persistence = createPersistence({
		key: 'admin_bitacora',
		defaultValues: {
			page: 1,
			limit: 100,
			searchQuery: '',
			filterMethod: ''
		}
	});

	const initialState = persistence.getInitialState();

	let logs = $state<AuditLogRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	let page = $state(initialState.page);
	let limit = $state(initialState.limit);
	let searchQuery = $state(initialState.searchQuery);
	let filterMethod = $state(initialState.filterMethod);

	let hasNextPage = $state(false);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			page,
			limit,
			searchQuery,
			filterMethod
		});
	});

	let isDetailModalOpen = $state(false);
	let selectedLog = $state<AuditLogRead | null>(null);

	function openDetail(log: AuditLogRead) {
		selectedLog = log;
		isDetailModalOpen = true;
	}

let hasAccess = $derived(hasPermission($authStore.user, 'audit_logs', 'read'));

// Filtros
let filteredLogs = $derived(
	logs.filter((log) => {
		const query = searchQuery.toLowerCase().trim();
		return (
			query === '' ||
			(log.resource && log.resource.toLowerCase().includes(query)) ||
			(log.action && log.action.toLowerCase().includes(query)) ||
			(log.path && log.path.toLowerCase().includes(query)) ||
			(log.metadata_json && log.metadata_json.toLowerCase().includes(query)) ||
			(log.user_id && log.user_id.toString().includes(query))
		);
	})
);

function setPageSize(e: Event) {
	const v = Number((e.currentTarget as HTMLSelectElement).value);
	if (!Number.isFinite(v) || v <= 0) return;
	limit = v;
	void load(1);
}

async function load(targetPage?: number) {
	loading = true;
		try {
		const currentPage = targetPage ?? page;
		const offset = (currentPage - 1) * limit;

		const result = await fetchAuditLogs({
				method: filterMethod || undefined,
			limit: limit + 1,
			offset
			});
		logs = result.slice(0, limit);
		hasNextPage = result.length > limit;
		page = currentPage;
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error de conexión';
			toast.error('Error al cargar bitácora: ' + error);
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

	function formatDate(iso: string): string {
		try {
			const d = new Date(iso);
			return d.toLocaleString('es');
		} catch {
			return iso;
		}
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'audit_logs', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load(page);
	});
</script>

<svelte:head>
	<title>Admin - Bitácora</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Bitácora</h1>
			<p class="admin-desc">Registro de acciones del sistema: creaciones, modificaciones y eliminaciones de usuarios, roles o permisos.</p>
		</div>
		<div class="admin-toolbar gap-3">
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
				<input type="text" placeholder="Buscar en bitácora..." bind:value={searchQuery} oninput={() => page = 1} />
			</div>

			<div class="admin-filters w-full justify-between lg:w-auto lg:justify-end">
				<select
					id="filter-method"
					bind:value={filterMethod}
					onchange={() => load(1)}
				>
					<option value="">Todos los métodos</option>
					<option value="POST">Crear (POST)</option>
					<option value="UPDATE">Actualizar (PUT/PATCH)</option>
					<option value="DELETE">Eliminar (DELETE)</option>
				</select>

				<button type="button" class="admin-btn-secondary !p-2" onclick={async () => { await load(page); toast.info('Bitácora actualizada'); }} title="Actualizar">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 22v-6h6"/></svg>
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
			<div class="admin-table-wrapper">
			<table class="admin-table">
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Tipo</th>
						<th>Usuario ID</th>
						<th>Recurso</th>
						<th>Acción</th>
						<th>Método</th>
						<th>Path</th>
						<th>Detalle</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredLogs as log}
						<tr>
							<td class="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDate(log.created_at)}</td>
							<td><span class="admin-badge">{log.event_type}</span></td>
							<td>{log.user_id ?? '—'}</td>
							<td>{log.resource ?? '—'}</td>
							<td>{log.action ?? '—'}</td>
							<td>{log.method ?? '—'}</td>
							<td class="max-w-xs truncate" title={log.path ?? ''}>{log.path ?? '—'}</td>
							<td>
								<button class="action-icon-btn" onclick={() => openDetail(log)} title="Ver Detalle">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			</div>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {filteredLogs.length} registro(s)</span>
					<div class="admin-page-size">
						<label for="page-size-bitacora" class="text-sm">Filas:</label>
						<select id="page-size-bitacora" value={limit} onchange={setPageSize}>
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

<AuditLogDetailModal 
	isOpen={isDetailModalOpen} 
	log={selectedLog} 
	onClose={() => isDetailModalOpen = false} 
/>
{/if}
