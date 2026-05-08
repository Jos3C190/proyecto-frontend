<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import {
		fetchClients,
		deactivateClient
	} from '$lib/services/admin.service';
	import type { User } from '$lib/types';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import '../adminPage.css';

	const persistence = createPersistence({
		key: 'admin_clients',
		defaultValues: {
			page: 1,
			pageSize: 50,
			searchQuery: ''
		}
	});

	const initialState = persistence.getInitialState();

	let clients = $state<User[]>([]);
	let loading = $state(true);
	let isConfirmModalOpen = $state(false);
	let clientToDeactivate = $state<User | null>(null);
	let actionLoading = $state(false);
	let error = $state<string | null>(null);
	
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

	let hasAccess = $derived(hasPermission($authStore.user, 'customers', 'read'));

	let filteredClients = $derived(
		clients.filter((c) => {
			const search = searchQuery.toLowerCase().trim();
			if (search === '') return true;

			const profile = c.profile || {};
			const firstName = (profile.first_name || '').toLowerCase();
			const lastName = (profile.last_name || '').toLowerCase();
			const email = (c.email || '').toLowerCase();
			const docNum = (profile.document_number || '').toLowerCase();
			const nit = (profile.nit || '').toLowerCase();
			const nrc = (profile.nrc || '').toLowerCase();
			const bizName = (profile.business_name || '').toLowerCase();

			return (
				email.includes(search) ||
				firstName.includes(search) ||
				lastName.includes(search) ||
				bizName.includes(search) ||
				docNum.includes(search) ||
				nit.includes(search) ||
				nrc.includes(search)
			);
		})
	);

	function displayName(u: User): string {
		const p = u.profile;
		if (!p) return u.email ?? '—';
		
		if (p.person_type === 'Juridica') {
			return p.business_name || p.first_name || u.email || '—';
		}

		const full = [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ');
		return full || u.email || '—';
	}

	async function load(targetPage?: number) {
		loading = true;
		try {
			const currentPage = targetPage ?? page;
			const offset = (currentPage - 1) * pageSize;

			const rawClients = await fetchClients({ limit: pageSize + 1, offset });

			clients = rawClients.slice(0, pageSize);
			hasNextPage = rawClients.length > pageSize;
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
		clientToDeactivate = u;
		isConfirmModalOpen = true;
	}

	async function confirmDeactivation() {
		if (!clientToDeactivate) return;
		actionLoading = true;
		try {
			await deactivateClient(clientToDeactivate.id);
			toast.success(`Cliente ${clientToDeactivate.email} desactivado`);
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
		if (!hasPermission($authStore.user, 'customers', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load(page);
	});
</script>

<svelte:head>
	<title>Admin - Clientes</title>
</svelte:head>

{#if hasAccess}
	<div class="admin-page fade-in">
		<div class="admin-header-container">
			<div>
				<h1 class="admin-title">Clientes</h1>
				<p class="admin-desc">Gestión de clientes y perfiles de facturación (DTE).</p>
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
					<input type="text" placeholder="Buscar por nombre, DUI, NIT o correo..." bind:value={searchQuery} oninput={() => page = 1} />
				</div>

				<div class="flex flex-wrap xl:flex-nowrap items-center gap-3">
					{#if hasPermission($authStore.user, 'customers', 'create')}
						<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
						<a href="/admin/clientes/nuevo" class="admin-btn">
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
							NUEVO CLIENTE
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
								<th>Nombre / Razón Social</th>
								<th>Documento</th>
								<th>Email</th>
								<th>Tipo</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#if filteredClients.length === 0}
								<tr>
									<td colspan="5" class="text-center py-6 text-slate-500">No se encontraron clientes.</td>
								</tr>
							{:else}
								{#each filteredClients as c}
									<tr>
										<td>
											<div class="flex flex-col">
												<span class="font-medium text-slate-900 dark:text-slate-100">{displayName(c)}</span>
												<span class="text-xs text-slate-500">{c.profile?.economic_activity || 'Sin actividad'}</span>
											</div>
										</td>
										<td>
											<div class="flex flex-col text-xs">
												{#if c.profile?.person_type === 'Juridica'}
													<span>NRC: {c.profile?.nrc || '—'}</span>
												{:else}
													<span>{c.profile?.document_type || 'DOC'}: {c.profile?.document_number || '—'}</span>
												{/if}
												<span>NIT: {c.profile?.nit || '—'}</span>
											</div>
										</td>
										<td>{c.email}</td>
										<td>
											<span class="admin-badge">
												{c.profile?.person_type || 'Natural'}
											</span>
										</td>
										<td>
											<div class="flex items-center gap-1">
												<a href="/admin/clientes/{c.id}" class="action-icon-btn" title="Ver Detalles">
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
														><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle
															cx="12"
															cy="12"
															r="3"
														/></svg
													>
												</a>
												{#if c.is_active}
													{#if hasPermission($authStore.user, 'customers', 'update')}
														<a href="/admin/clientes/{c.id}/editar" class="action-icon-btn" title="Editar">
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
																><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path
																	d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
																/></svg
															>
														</a>
													{/if}
													{#if hasPermission($authStore.user, 'customers', 'delete')}
														<button
															class="action-icon-btn danger"
															onclick={() => handleDeactivate(c)}
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
																stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" /></svg
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
						<span>Mostrando {filteredClients.length} cliente(s)</span>
						<div class="admin-page-size">
							<label for="page-size-clientes" class="text-sm">Filas:</label>
							<select id="page-size-clientes" value={pageSize} onchange={setPageSize}>
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
	title="Desactivar Cliente"
	message="¿Estás seguro de que deseas desactivar a {clientToDeactivate ? displayName(clientToDeactivate) : ''}? El cliente ya no podrá realizar reservaciones."
	confirmText="Desactivar"
	variant="danger"
	onConfirm={confirmDeactivation}
	onClose={() => (isConfirmModalOpen = false)}
	loading={actionLoading}
/>

