<script lang="ts">
	import { fetchPayments, fetchPaymentDetail } from '$lib/services/admin.service';
	import type { PaymentRead } from '$lib/types/reservation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import '../adminPage.css';

	let payments = $state<PaymentRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let hasAccess = $derived(hasPermission($authStore.user, 'payments', 'read'));

	// Filters
	let filters = $state({
		start_date: '',
		end_date: '',
		method: '',
		status: 'completed'
	});
	let searchQuery = $state('');

	// Details Modal
	let showDetails = $state(false);
	let viewingPayment = $state<PaymentRead | null>(null);
	let loadingDetails = $state(false);

	let filteredPayments = $derived(payments.filter(p => {
		if (!searchQuery) return true;
		const s = searchQuery.toLowerCase().trim();
		return (
			p.id.toString().includes(s) ||
			(p.reservation?.unique_id && p.reservation.unique_id.toLowerCase().includes(s)) ||
			(p.reservation?.user?.profile?.first_name && p.reservation.user.profile.first_name.toLowerCase().includes(s)) ||
			(p.reservation?.user?.profile?.last_name && p.reservation.user.profile.last_name.toLowerCase().includes(s)) ||
			(p.reservation?.user?.email && p.reservation.user.email.toLowerCase().includes(s))
		);
	}));

	// Pagination
	let page = $state(1);
	let pageSize = $state(10);
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

	async function loadPayments() {
		loading = true;
		try {
			payments = await fetchPayments({
				start_date: filters.start_date || undefined,
				end_date: filters.end_date || undefined,
				method: filters.method || undefined,
				status: filters.status || undefined
			});
			error = null;
			page = 1; // Reset memory page
		} catch (err: any) {
			error = err.message;
			toast.error('Error al cargar pagos: ' + err.message);
		} finally {
			loading = false;
		}
	}

	async function openDetails(paymentId: number) {
		loadingDetails = true;
		showDetails = true;
		try {
			viewingPayment = await fetchPaymentDetail(paymentId);
		} catch (err: any) {
			toast.error('Error al cargar detalle: ' + err.message);
			showDetails = false;
		} finally {
			loadingDetails = false;
		}
	}

	function handleFilter(e: Event) {
		e.preventDefault();
		loadPayments();
	}

	function resetFilters() {
		filters = { start_date: '', end_date: '', method: '', status: 'completed' };
		searchQuery = '';
		loadPayments();
	}

	onMount(() => {
		if (!hasPermission($authStore.user, 'payments', 'read')) {
			goto('/dashboard');
			return;
		}
		loadPayments();
	});

	function formatMethod(m: string) {
		const map: any = { card: 'Tarjeta', cash: 'Efectivo', transfer: 'Transferencia' };
		return map[m] || m;
	}
</script>

<svelte:head>
	<title>Admin - Finanzas y Pagos</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Panel de Finanzas</h1>
			<p class="admin-desc">Control total de ingresos, cobros y comprobantes fiscales.</p>
		</div>
		<div class="admin-toolbar flex-wrap">
			<form onsubmit={handleFilter} class="flex flex-wrap items-center gap-2 w-full">
				<div class="relative flex-1 min-w-[200px] h-[34px]">
					<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input type="text" placeholder="Buscar ID, reserva, cliente..." bind:value={searchQuery} oninput={() => page = 1} class="w-full pl-9 pr-4 py-1.5 h-full text-xs border border-slate-200 rounded-lg focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter']" />
				</div>
				<div class="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 bg-white dark:bg-slate-800 dark:border-slate-700 transition-all font-['Inter'] h-[34px]">
					<span class="text-slate-400 text-[10px] font-bold uppercase ml-1">Desde</span>
					<input type="date" bind:value={filters.start_date} class="border-none bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 p-0" />
				</div>
				<div class="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 bg-white dark:bg-slate-800 dark:border-slate-700 transition-all font-['Inter']">
					<span class="text-slate-400 text-[10px] font-bold uppercase ml-1">Hasta</span>
					<input type="date" bind:value={filters.end_date} class="border-none bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 p-0" />
				</div>
				<select bind:value={filters.method} class="text-xs h-[34px] border border-slate-200 rounded-lg px-3 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter'] outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 cursor-pointer">
					<option value="">Todo Método</option>
					<option value="card">Tarjeta</option>
					<option value="cash">Efectivo</option>
					<option value="transfer">Transferencia</option>
				</select>
				<button type="submit" class="action-icon-btn h-[34px] w-[34px] bg-slate-100 dark:bg-slate-800 hover:bg-[#D4AF37] hover:text-white" title="Filtrar">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
				</button>
				<button type="button" class="action-icon-btn h-[34px] w-[34px] hover:bg-slate-200 dark:hover:bg-slate-700" onclick={resetFilters} title="Limpiar">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			</form>
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
							<tr>
								<td class="text-xs font-mono text-slate-400">#{p.id}</td>
								<td>
									<div class="flex flex-col">
										<span class="font-medium text-slate-700 dark:text-slate-300">{new Date(p.created_at).toLocaleDateString()}</span>
										<span class="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleTimeString()}</span>
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
											<span class="text-sm">{p.reservation.user.profile?.first_name} {p.reservation.user.profile?.last_name}</span>
											<span class="text-[10px] text-slate-400">{p.reservation.user.email}</span>
										</div>
									{:else}
										<span class="text-slate-400">ID: {p.reservation?.user_id}</span>
									{/if}
								</td>
								<td><span class="admin-badge">{formatMethod(p.method)}</span></td>
								<td>
									<span class={p.status === 'completed' ? 'admin-badge' : 'admin-badge-inactive'}>
										{p.status}
									</span>
								</td>
								<td><strong class="text-slate-900 dark:text-amber-500 font-black text-base">${p.amount}</strong></td>
								<td>
									<div class="flex items-center gap-1">
										{#if false}
										<button class="action-icon-btn" onclick={() => openDetails(p.id)} title="Ver Recibo">
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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

<!-- Details Modal -->
{#if showDetails}
	<div class="admin-modal-overlay flex items-center justify-center p-4" role="dialog" aria-modal="true" onclick={() => showDetails = false}>
		<div class="admin-modal max-w-md w-full" onclick={(e) => e.stopPropagation()} role="document">
			{#if loadingDetails}
				<p class="p-12 text-center text-slate-500">Cargando recibo fiscal...</p>
			{:else if viewingPayment}
				<div class="receipt bg-white dark:bg-slate-900 p-8 rounded-lg shadow-inner border border-slate-200 dark:border-slate-800 relative overflow-hidden">
					<!-- Receipt Header -->
					<div class="text-center mb-6">
						<h2 class="text-2xl font-black text-slate-800 dark:text-white tracking-widest uppercase">AFE RESORT</h2>
						<p class="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Comprobante Fiscal Digital</p>
						<div class="w-12 h-1 bg-amber-500 mx-auto mt-4"></div>
					</div>

					<!-- Receipt Data -->
					<div class="space-y-4 font-mono text-xs text-slate-600 dark:text-slate-400">
						<div class="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
							<span>TRANSACCIÓN:</span>
							<strong class="text-slate-900 dark:text-slate-200">#PAY-{viewingPayment.id}</strong>
						</div>
						<div class="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
							<span>FECHA:</span>
							<span class="text-slate-900 dark:text-slate-200">{new Date(viewingPayment.created_at).toLocaleString()}</span>
						</div>
						<div class="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
							<span>CLIENTE:</span>
							<span class="text-slate-900 dark:text-slate-200 uppercase">{viewingPayment.receipt_data?.customer || 'N/A'}</span>
						</div>
						<div class="flex justify-between border-b border-dashed border-slate-200 dark:border-slate-800 pb-2">
							<span>TIPO RECIBO:</span>
							<span class="text-slate-900 dark:text-slate-200 uppercase">{viewingPayment.receipt_type?.replace('_', ' ') || 'CONSUMIDOR FINAL'}</span>
						</div>
						
						<div class="py-4 space-y-2">
							<p class="text-center font-bold text-slate-800 dark:text-slate-300">DETALLE DE ESTANCIA</p>
							<div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded space-y-1">
								<p class="flex justify-between"><span>Habitación:</span> <span>#{viewingPayment.receipt_data?.room_number}</span></p>
								<p class="flex justify-between"><span>Entrada:</span> <span>{viewingPayment.receipt_data?.check_in}</span></p>
								<p class="flex justify-between"><span>Salida:</span> <span>{viewingPayment.receipt_data?.check_out}</span></p>
								<p class="flex justify-between"><span>Ref Reserva:</span> <span>{viewingPayment.receipt_data?.reservation_id}</span></p>
							</div>
						</div>

						<div class="pt-4 border-t-2 border-slate-900 dark:border-slate-700 space-y-2">
							<div class="flex justify-between text-base">
								<span class="font-black text-slate-900 dark:text-white">TOTAL CANCELADO:</span>
								<strong class="text-amber-600 dark:text-amber-500 font-black">${viewingPayment.amount}</strong>
							</div>
							<div class="flex justify-between text-[10px]">
								<span>MÉTODO:</span>
								<span class="uppercase">{formatMethod(viewingPayment.method)}</span>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div class="mt-8 text-center text-[9px] text-slate-400 space-y-1">
						<p>Este documento es una representación impresa de un CFDI.</p>
					</div>
					
					<!-- Decorative corner -->
					<div class="absolute -top-6 -right-6 w-12 h-12 bg-amber-500 rotate-45"></div>
				</div>

				<div class="admin-modal-actions mt-6">
					<button type="button" class="admin-btn w-full" onclick={() => window.print()}>Imprimir Comprobante</button>
					<button type="button" class="admin-btn-secondary w-full" onclick={() => showDetails = false}>Cerrar</button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.receipt {
		font-family: 'Courier New', Courier, monospace;
	}
	@media print {
		:global(body *) {
			visibility: hidden;
		}
		.receipt, .receipt * {
			visibility: visible;
		}
		.receipt {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			border: none !important;
			box-shadow: none !important;
		}
	}
</style>
{/if}
