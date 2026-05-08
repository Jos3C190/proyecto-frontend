<script lang="ts">
	import { fetchPayments, fetchPaymentDetail } from '$lib/services/admin.service';
	import type { PaymentRead } from '$lib/types/reservation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import '../adminPage.css';

	const persistence = createPersistence({
		key: 'admin_payments',
		defaultValues: {
			page: 1,
			pageSize: 10,
			searchQuery: '',
			filters: {
				start_date: '',
				end_date: '',
				method: '',
				status: ''
			}
		}
	});

	const initialState = persistence.getInitialState();

	let payments = $state<PaymentRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let hasAccess = $derived(hasPermission($authStore.user, 'payments', 'read'));

	// Filters
	let filters = $state(initialState.filters);
	let searchQuery = $state(initialState.searchQuery);

	// Pagination
	let page = $state(initialState.page);
	let pageSize = $state(initialState.pageSize);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			page,
			pageSize,
			searchQuery,
			filters
		});
	});

	let filteredPayments = $derived(payments.filter(p => {
		if (!searchQuery) return true;
		const s = searchQuery.toLowerCase().trim();
		return (
			p.id.toString().includes(s) ||
			(p.reservation?.unique_id && p.reservation.unique_id.toLowerCase().includes(s)) ||
			(p.reservation?.user?.profile?.first_name && p.reservation.user.profile.first_name.toLowerCase().includes(s)) ||
			(p.reservation?.user?.profile?.last_name && p.reservation.user.profile.last_name.toLowerCase().includes(s)) ||
			(p.reservation?.user?.profile?.business_name && p.reservation.user.profile.business_name.toLowerCase().includes(s)) ||
			(p.reservation?.user?.email && p.reservation.user.email.toLowerCase().includes(s))
		);
	}));

	// Pagination
	let paginatedPayments = $derived(filteredPayments.slice((page - 1) * pageSize, page * pageSize));
	let totalPages = $derived(Math.ceil(filteredPayments.length / pageSize) || 1);
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

	// Summary stats
	let stats = $derived.by(() => {
		const total = filteredPayments.reduce((acc, p) => acc + Number(p.amount), 0);
		const count = filteredPayments.length;
		const byMethod = filteredPayments.reduce((acc, p) => {
			acc[p.method] = (acc[p.method] || 0) + Number(p.amount);
			return acc;
		}, {} as Record<string, number>);
		return { total, count, byMethod };
	});

	async function loadPayments(resetPage = true) {
		loading = true;
		try {
			payments = await fetchPayments({
				start_date: filters.start_date || undefined,
				end_date: filters.end_date || undefined,
				method: filters.method || undefined,
				status: filters.status || undefined
			});
			error = null;
			if (resetPage) page = 1;
		} catch (err: any) {
			error = err.message;
			toast.error('Error al cargar pagos: ' + err.message);
		} finally {
			loading = false;
		}
	}

	function handleFilter(e: Event) {
		e.preventDefault();
		loadPayments();
	}

	function resetFilters() {
		filters = { start_date: '', end_date: '', method: '', status: '' };
		searchQuery = '';
		loadPayments();
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'payments', 'read')) {
			goto('/dashboard');
			return;
		}
		// Cargamos los datos pero respetando la página persistida si ya la tenemos
		// El loadPayments actual hace reset a 1, así que lo modificaré
		await loadPayments(false);
	});

	function formatMethod(m: string) {
		const map: any = { card: 'Tarjeta', cash: 'Efectivo', transfer: 'Transferencia', refund: 'Reembolso' };
		return map[m] || m;
	}

	function formatDateTime(dateStr: string) {
		if (!dateStr) return '---';
		const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
		if (match) {
			const [_, y, m, d, hh, mm, ss] = match;
			const hour = parseInt(hh);
			const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
			const h12 = hour % 12 || 12;
			return {
				date: `${parseInt(d)}/${parseInt(m)}/${y}`,
				time: `${h12}:${mm}:${ss} ${ampm}`
			};
		}
		return { date: dateStr, time: '' };
	}
</script>

<svelte:head>
	<title>Admin - Finanzas y Pagos</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Pagos</h1>
			<p class="admin-desc">Control total de ingresos, cobros y comprobantes fiscales.</p>
		</div>
		<div class="admin-toolbar">
			<div class="admin-search-wrapper">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				<input type="text" placeholder="Buscar ID, reserva, cliente..." bind:value={searchQuery} oninput={() => page = 1} />
			</div>

			<div class="flex flex-wrap xl:flex-nowrap items-center gap-3">
				<div class="admin-filters !flex-nowrap">
					<div class="admin-input-group !gap-1.5 px-3">
						<span>IN</span>
						<input type="date" bind:value={filters.start_date} onchange={loadPayments} class="!w-[85px] text-xs" />
						<span class="text-slate-300 dark:text-slate-600 font-light mx-1">/</span>
						<span>OUT</span>
						<input type="date" bind:value={filters.end_date} onchange={loadPayments} class="!w-[85px] text-xs" />
						
						{#if filters.start_date || filters.end_date}
							<button type="button" class="ml-1 text-slate-400 hover:text-red-500 transition-colors" onclick={resetFilters} title="Limpiar fechas">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
							</button>
						{/if}
					</div>

					<select bind:value={filters.method} onchange={loadPayments} class="!w-[130px]">
						<option value="">Todo Método</option>
						<option value="card">Tarjeta</option>
						<option value="cash">Efectivo</option>
						<option value="transfer">Transferencia</option>
					</select>

					<select bind:value={filters.status} onchange={loadPayments} class="!w-[130px]">
						<option value="">Todo Estado</option>
						<option value="completed">Completado</option>
						<option value="verifying">Verificando</option>
						<option value="failed">Rechazado/Fallido</option>
					</select>
				</div>

				<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
				<button type="button" class="admin-btn !px-6" onclick={loadPayments} title="Filtrar">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
					<span>FILTRAR</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Statistics Cards Refined (Temporarily hidden) -->
	{#if false}
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-5xl">
		<!-- Card Total Revenue -->
		<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
				</div>
				<span class="text-xs font-bold text-slate-500 uppercase tracking-widest">Ingresos Totales</span>
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
					${stats.total.toLocaleString()}
				</span>
				<span class="text-xs text-slate-400 font-bold">USD</span>
			</div>
		</div>

		<!-- Card Transactions -->
		<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
				</div>
				<span class="text-xs font-bold text-slate-500 uppercase tracking-widest">Transacciones</span>
			</div>
			<div class="flex items-baseline gap-2">
				<span class="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.count}</span>
				<span class="text-xs text-slate-400 font-bold uppercase">Cobros</span>
			</div>
		</div>

		<!-- Card Distribution Vertical -->
		<div class="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
			<span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block text-center">Distribución por Canal</span>
			<div class="space-y-3">
				{#each Object.entries(stats.byMethod) as [method, amount]}
					<div>
						<div class="flex justify-between text-[11px] mb-1">
							<span class="text-slate-600 dark:text-slate-400 font-medium">{formatMethod(method)}</span>
							<span class="text-slate-900 dark:text-white font-black">${amount}</span>
						</div>
						<div class="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
							<div class="bg-amber-500 h-full transition-all duration-700" 
								 style="width: {(amount / (stats.total || 1)) * 100}%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
	{/if}



	<section class="admin-section">
		{#if loading && payments.length === 0}
			<p class="admin-loading">Cargando transacciones...</p>
		{:else if filteredPayments.length === 0 && payments.length > 0}
			<div class="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
				<p class="text-slate-500">No se encontraron pagos con la búsqueda de texto.</p>
			</div>
		{:else if payments.length === 0}
			<div class="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
				<p class="text-slate-500">No se encontraron pagos con los criterios seleccionados.</p>
			</div>
		{:else}
			<div class="admin-table-wrapper">
				<table class="admin-table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Fecha</th>
							<th>Concepto / Reserva</th>
							<th>Cliente</th>
							<th>Método</th>
							<th>Estado</th>
							<th>Monto</th>
							<th>Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedPayments as p}
							{@const dt = formatDateTime(p.created_at)}
							<tr>
								<td class="text-xs font-mono text-slate-400">#{p.id}</td>
								<td>
									<div class="flex flex-col">
										<span class="font-medium text-slate-700 dark:text-slate-300">{dt.date}</span>
										<span class="text-[10px] text-slate-400">{dt.time}</span>
									</div>
								</td>
								<td>
									{#if p.reservation}
										<div class="flex flex-col">
											<span class="text-xs font-bold text-slate-800 dark:text-slate-200">{p.reservation.unique_id}</span>
											<span class="text-[10px] text-slate-500">Habitación #{p.reservation.room?.number}</span>
										</div>
									{:else}
										<span class="text-slate-400 italic">Desvinculada</span>
									{/if}
								</td>
								<td>
									{#if p.reservation?.user}
										<div class="flex flex-col">
											<span class="text-sm">
												{#if p.reservation.user.profile?.person_type === 'Juridica'}
													{p.reservation.user.profile.business_name || p.reservation.user.profile.first_name}
												{:else}
													{p.reservation.user.profile?.first_name} {p.reservation.user.profile?.last_name === 'N/A' ? '' : p.reservation.user.profile?.last_name || ''}
												{/if}
											</span>
											<span class="text-[10px] text-slate-400">{p.reservation.user.email}</span>
										</div>
									{:else}
										<span class="text-slate-400">ID: {p.reservation?.user_id}</span>
									{/if}
								</td>
								<td><span class="admin-badge">{formatMethod(p.method)}</span></td>
								<td>
									<span class={p.status === 'completed' ? 'admin-badge' : p.status === 'verifying' ? 'admin-badge !bg-orange-500/20 !text-orange-700 !border-orange-500/30 dark:!bg-orange-900/30 dark:!text-orange-400' : 'admin-badge-inactive'}>
										{p.status}
									</span>
								</td>
								<td><strong class="text-slate-900 dark:text-white text-base">${p.amount}</strong></td>
								<td>
									<div class="flex items-center gap-1">
										<button class="action-icon-btn" onclick={() => goto(`/admin/pagos/${p.id}`)} title="Ver Detalles">
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
										</button>
										{#if p.status === 'completed' && p.method !== 'refund'}
											<button class="action-icon-btn !text-amber-600 hover:!bg-amber-50 dark:hover:!bg-amber-900/20" onclick={() => goto(`/admin/pagos/${p.id}/dte`)} title="Ver DTE">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {filteredPayments.length} pago(s)</span>
					<div class="admin-page-size">
						<label for="page-size-payments" class="text-sm">Filas:</label>
						<select id="page-size-payments" value={pageSize} onchange={setPageSize}>
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
		{/if}
	</section>
</div>

{/if}
