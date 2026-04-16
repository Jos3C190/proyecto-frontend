<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { fetchAuditLogs } from '$lib/services/admin.service';
	import type { AuditLogRead } from '$lib/services/admin.service';
	import '../adminPage.css';

	let logs = $state<AuditLogRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let filterMethod = $state('');
	let limit = $state(100);
let page = $state(1);
let hasNextPage = $state(false);

let hasAccess = $derived(hasPermission($authStore.user, 'audit_logs', 'read'));

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
		await load();
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
		<div class="admin-toolbar">
			<div class="flex items-center gap-3">
				<label for="filter-method" class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Método:</label>
				<select
					id="filter-method"
					bind:value={filterMethod}
					onchange={() => load(1)}
				>
					<option value="">Todos</option>
					<option value="POST">Crear (POST)</option>
					<option value="UPDATE">Actualizar (PUT/PATCH)</option>
					<option value="DELETE">Eliminar (DELETE)</option>
				</select>
			</div>
			<button type="button" class="admin-btn-secondary" onclick={async () => { await load(page); toast.info('Bitácora actualizada'); }}>Actualizar</button>
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
					{#each logs as log}
						<tr>
							<td class="whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDate(log.created_at)}</td>
							<td><span class="admin-badge">{log.event_type}</span></td>
							<td>{log.user_id ?? '—'}</td>
							<td>{log.resource ?? '—'}</td>
							<td>{log.action ?? '—'}</td>
							<td>{log.method ?? '—'}</td>
							<td class="max-w-xs truncate" title={log.path ?? ''}>{log.path ?? '—'}</td>
							<td class="align-top text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-words max-w-xl">
								{log.metadata_json ?? '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			</div>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {logs.length} registro(s)</span>
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
{/if}
