<script lang="ts">
	import { fetchPayments, fetchPaymentsStats, fetchPaymentDetail, fetchSystemSettings } from '$lib/services/admin.service';
	import type { PaymentRead, PaginatedPayments } from '$lib/types/reservation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import { getFromCache, saveToCache } from '$lib/utils/cache';
	import { DollarSign, CreditCard, RotateCcw } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
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
	let totalPaymentsCount = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let activeTooltip = $state<string | null>(null);

	let ivaRate = $state(0.13);
	let tourismRate = $state(0.05);

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

	let filteredPayments = $derived(payments);

	// Pagination
	let paginatedPayments = $derived(payments);
	let totalPages = $derived(Math.ceil(totalPaymentsCount / pageSize) || 1);
	let hasNextPage = $derived(page < totalPages);
	let hasPrevPage = $derived(page > 1);

	function nextPage() { if (hasNextPage && !loading) { void loadPayments(page + 1); } }
	function prevPage() { if (hasPrevPage && !loading) { void loadPayments(page - 1); } }
	function setPageSize(e: Event) {
		const v = Number((e.currentTarget as HTMLSelectElement).value);
		if (!Number.isFinite(v) || v <= 0) return;
		pageSize = v;
		void loadPayments(1);
	}

	// Summary stats populated by backend
	let stats = $state({
		totalReceived: 0,
		totalRefunded: 0,
		count: 0,
		refundCount: 0,
		roomBaseSum: 0,
		extrasBaseSum: 0,
		incidentalsBaseSum: 0,
		ivaSum: 0,
		tourismSum: 0,
		byMethod: {} as Record<string, number>
	});

	async function loadPayments(targetPage?: number, forceFetch = false) {
		const currentPage = targetPage ?? page;
		const offset = (currentPage - 1) * pageSize;
		const querySearch = searchQuery.trim();
		
		const cacheKey = `payments_${pageSize}_${offset}_${querySearch}_${filters.start_date}_${filters.end_date}_${filters.method}_${filters.status}`;
		const statsKey = `payments_stats_${querySearch}_${filters.start_date}_${filters.end_date}_${filters.method}_${filters.status}`;

		// 1. SWR Cache check
		const cachedPayments = getFromCache<PaginatedPayments>(cacheKey);
		const cachedStats = getFromCache<any>(statsKey);

		if (cachedPayments && cachedStats && !forceFetch) {
			payments = cachedPayments.items || [];
			totalPaymentsCount = cachedPayments.total || 0;
			stats = cachedStats;
			page = currentPage;
			loading = false;
			error = null;
		} else {
			loading = true;
		}

		try {
			const [res, statsData] = await Promise.all([
				fetchPayments({
					start_date: filters.start_date || undefined,
					end_date: filters.end_date || undefined,
					method: filters.method || undefined,
					status: filters.status || undefined,
					limit: pageSize,
					offset,
					search: querySearch || undefined
				}),
				fetchPaymentsStats({
					start_date: filters.start_date || undefined,
					end_date: filters.end_date || undefined,
					method: filters.method || undefined,
					status: filters.status || undefined,
					search: querySearch || undefined
				})
			]);

			saveToCache(cacheKey, res);
			saveToCache(statsKey, statsData);

			payments = res.items || [];
			totalPaymentsCount = res.total || 0;
			stats = statsData;
			page = currentPage;
			error = null;
		} catch (err: any) {
			if (!cachedPayments || !cachedStats) {
				error = err.message;
				toast.error('Error al cargar pagos: ' + err.message);
			}
		} finally {
			loading = false;
		}
	}

	let debounceTimeout: any;
	function handleSearchInput() {
		page = 1;
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(() => {
			void loadPayments(1);
		}, 300);
	}

	function handleFilter(e: Event) {
		e.preventDefault();
		void loadPayments(1);
	}

	function resetFilters() {
		filters = { start_date: '', end_date: '', method: '', status: '' };
		searchQuery = '';
		void loadPayments(1);
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'payments', 'read')) {
			goto('/dashboard');
			return;
		}
		
		// Cargar tasas impositivas dinámicas de configuración MH
		try {
			const sysRes = await fetchSystemSettings();
			const ivaSetting = sysRes.find(s => s.key === 'tax_iva_rate')?.value;
			const tourismSetting = sysRes.find(s => s.key === 'tax_tourism_rate')?.value;
			if (ivaSetting) ivaRate = parseFloat(ivaSetting) / 100.0;
			if (tourismSetting) tourismRate = parseFloat(tourismSetting) / 100.0;
		} catch (e) {
			console.error("Error al cargar configuraciones impositivas en pagos:", e);
		}

		await loadPayments(page);
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

<svelte:window onclick={() => activeTooltip = null} />

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
				<input type="text" placeholder="Buscar ID, reserva, cliente..." bind:value={searchQuery} oninput={handleSearchInput} />
			</div>

			<div class="flex flex-wrap xl:flex-nowrap items-center gap-3">
				<div class="admin-filters !flex-nowrap">
					<div class="admin-input-group !gap-1.5 px-3">
						<span>IN</span>
						<input type="date" bind:value={filters.start_date} onchange={() => loadPayments(1)} class="!w-[85px] text-xs" />
						<span class="text-slate-300 dark:text-slate-600 font-light mx-1">/</span>
						<span>OUT</span>
						<input type="date" bind:value={filters.end_date} onchange={() => loadPayments(1)} class="!w-[85px] text-xs" />
						
						{#if filters.start_date || filters.end_date}
							<button type="button" class="ml-1 text-slate-400 hover:text-red-500 transition-colors" onclick={resetFilters} title="Limpiar fechas">
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
							</button>
						{/if}
					</div>

					<select bind:value={filters.method} onchange={() => loadPayments(1)} class="!w-[130px]">
						<option value="">Todo Método</option>
						<option value="card">Tarjeta</option>
						<option value="cash">Efectivo</option>
						<option value="transfer">Transferencia</option>
					</select>

					<select bind:value={filters.status} onchange={() => loadPayments(1)} class="!w-[130px]">
						<option value="">Todo Estado</option>
						<option value="completed">Completado</option>
						<option value="verifying">Verificando</option>
						<option value="failed">Rechazado/Fallido</option>
					</select>
				</div>

				<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
				<button type="button" class="admin-btn !px-6" onclick={() => loadPayments(1)} title="Filtrar">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
					<span>FILTRAR</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Dashboard KPIs -->
	{#if payments.length > 0}
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<!-- Card Total Recaudado -->
		<div class="admin-kpi-card flex flex-col justify-between relative !overflow-visible !py-4">
			<div class="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
					<DollarSign class="w-6 h-6" />
				</div>
				<div>
					<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
						Total Recaudado
						<button type="button" class="cursor-pointer text-slate-400 hover:text-emerald-500 transition-colors p-0.5 focus:outline-none align-middle" 
							onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'recaudado' ? null : 'recaudado'; }}>
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
						</button>
					</p>
					{#if activeTooltip === 'recaudado'}
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium font-sans whitespace-normal normal-case tracking-normal" transition:fade>
							<p class="font-bold text-emerald-500 mb-0.5">Caja Bruta Recaudada</p>
							<p>Suma total de cobros recibidos con éxito en el período. Representa el flujo de caja entrante (las devoluciones o reembolsos no se restan de este valor, sino que se muestran por separado).</p>
							<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
						</div>
					{/if}
					<h3 class="text-2xl font-black text-emerald-500 tracking-tighter">
						${stats.totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</h3>
				</div>
			</div>

			<!-- Breakdown Recaudado -->
			<div class="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 relative z-10 text-[10px]">
				<div class="flex justify-between">
					<span class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Alojamiento (Neto)</span>
					<span class="text-slate-900 dark:text-white font-black">${stats.roomBaseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Extras (Neto)</span>
					<span class="text-slate-900 dark:text-white font-black">${stats.extrasBaseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Incidentales (Neto)</span>
					<span class="text-slate-900 dark:text-white font-black">${stats.incidentalsBaseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
				</div>
				<div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold border-t border-slate-100/50 dark:border-slate-700/30 pt-1.5 mt-1.5">
					<span class="font-bold uppercase tracking-wider">IVA Recaudado (13%)</span>
					<span class="font-black">${stats.ivaSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
				</div>
				<div class="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
					<span class="font-bold uppercase tracking-wider">Impuesto Turismo (5%)</span>
					<span class="font-black">${stats.tourismSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
				</div>
			</div>
		</div>

		<!-- Card Total Reembolsado -->
		<div class="admin-kpi-card flex flex-col justify-between relative !overflow-visible !py-4">
			<div class="absolute -right-10 -bottom-10 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl"></div>
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
					<RotateCcw class="w-6 h-6" />
				</div>
				<div>
					<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
						Total Reembolsado
						<button type="button" class="cursor-pointer text-slate-400 hover:text-rose-500 transition-colors p-0.5 focus:outline-none align-middle" 
							onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'reembolsado' ? null : 'reembolsado'; }}>
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
						</button>
					</p>
					{#if activeTooltip === 'reembolsado'}
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium font-sans whitespace-normal normal-case tracking-normal" transition:fade>
							<p class="font-bold text-rose-450 dark:text-rose-400 mb-0.5">Devoluciones Emitidas</p>
							<p>Suma total de fondos devueltos a los huéspedes por cancelaciones, depósitos de garantía liberados o correcciones de facturación.</p>
							<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
						</div>
					{/if}
					<h3 class="text-2xl font-black text-rose-500 tracking-tighter">
						${stats.totalRefunded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</h3>
				</div>
			</div>

			<!-- Breakdown Reembolsos -->
			<div class="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 relative z-10 text-[10px]">
				<div class="flex justify-between">
					<span class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Transacciones Devolución</span>
					<span class="text-slate-900 dark:text-white font-black">{stats.refundCount} deud.</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Monto Promedio Devolución</span>
					<span class="text-slate-900 dark:text-white font-black">
						${(stats.totalRefunded / (stats.refundCount || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Retorno Máximo Posible</span>
					<span class="text-slate-900 dark:text-white font-black">100% Garantizado</span>
				</div>
				<div class="flex justify-between text-rose-600 dark:text-rose-400 font-semibold border-t border-slate-100/50 dark:border-slate-700/30 pt-1.5 mt-1.5">
					<span class="font-bold uppercase tracking-wider">Tasa de Reclamo (Pérdida)</span>
					<span class="font-black">
						{((stats.totalRefunded / (stats.totalReceived || 1)) * 100).toFixed(2)}%
					</span>
				</div>
			</div>
		</div>

		<!-- Card Transacciones y Canales -->
		<div class="admin-kpi-card flex flex-col justify-between relative !overflow-visible !py-4">
			<div class="absolute -right-10 -bottom-10 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
			<div class="flex items-center gap-4">
				<div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
					<CreditCard class="w-6 h-6" />
				</div>
				<div>
					<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
						Transacciones
						<button type="button" class="cursor-pointer text-slate-400 hover:text-blue-500 transition-colors p-0.5 focus:outline-none align-middle" 
							onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'transacciones' ? null : 'transacciones'; }}>
							<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
						</button>
					</p>
					{#if activeTooltip === 'transacciones'}
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium font-sans whitespace-normal normal-case tracking-normal" transition:fade>
							<p class="font-bold text-blue-450 dark:text-blue-400 mb-0.5">Volumen de Transacciones</p>
							<p>Conteo total de cobros recibidos con éxito en el período actual, clasificados y ponderados según el canal de pago utilizado.</p>
							<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
						</div>
					{/if}
					<h3 class="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{stats.count} <span class="text-xs text-slate-400 font-bold uppercase tracking-wider ml-1">Cobros</span></h3>
				</div>
			</div>

			<!-- Breakdown -->
			{#if Object.keys(stats.byMethod).length > 0}
			<div class="space-y-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 relative z-10">
				{#each Object.entries(stats.byMethod) as [method, amount]}
					<div>
						<div class="flex justify-between text-[10px] mb-1">
							<span class="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{formatMethod(method)}</span>
							<span class="text-slate-900 dark:text-white font-black">${Number(amount).toFixed(2)}</span>
						</div>
						<div class="w-full bg-slate-100 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
							<div class="bg-blue-500 h-full transition-all duration-700" 
								 style="width: {(Number(amount) / (stats.totalReceived || 1)) * 100}%"></div>
						</div>
					</div>
				{/each}
			</div>
			{/if}
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
					<button class="admin-btn-secondary" onclick={prevPage} disabled={loading || !hasPrevPage}>
						Anterior
					</button>
					<span class="admin-pagination-info">Página {page} de {totalPages}</span>
					<button class="admin-btn-secondary" onclick={nextPage} disabled={loading || !hasNextPage}>
						Siguiente
					</button>
				</div>
			</div>
		{/if}
	</section>
</div>

{/if}
