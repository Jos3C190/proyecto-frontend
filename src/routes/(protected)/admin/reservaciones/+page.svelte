<script lang="ts">
	import { 
		getAdminReservations,
		deleteAdminReservation
	} from '$lib/services/reservation.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { toast } from '$lib/stores/toast.svelte';
	
	import '../adminPage.css';

	let reservations = $state<ReservationRead[]>([]);
	
	let loading = $state(true);
	let error = $state<string | null>(null);

	let hasAccess = $derived(hasPermission($authStore.user, 'reservations', 'read'));

	// Filters
	let searchQuery = $state('');
	let selectedStatus = $state('');
	
	let filterStartDate = $state('');
	let filterEndDate = $state('');

	function clearDateFilter() {
		filterStartDate = '';
		filterEndDate = '';
		page = 1;
	}

	let filteredReservations = $derived(reservations.filter(r => {
		const search = searchQuery.toLowerCase().trim();
		const matchesSearch = search === '' || 
			r.unique_id.toLowerCase().includes(search) || 
			(r.user?.email && r.user.email.toLowerCase().includes(search)) || 
			(r.user?.profile?.first_name && r.user.profile.first_name.toLowerCase().includes(search)) || 
			(r.user?.profile?.last_name && r.user.profile.last_name.toLowerCase().includes(search));
		
		const matchesStatus = selectedStatus === '' || r.status === selectedStatus;
		
		let matchesDates = true;
		if (filterStartDate || filterEndDate) {
			const rStart = r.check_in;
			const rEnd = r.check_out;
			
			if (filterStartDate && filterEndDate) {
				// overlap condition: (rStart <= filterEndDate) && (rEnd >= filterStartDate)
				matchesDates = rStart <= filterEndDate && rEnd >= filterStartDate;
			} else if (filterStartDate) {
				matchesDates = rEnd >= filterStartDate;
			} else if (filterEndDate) {
				matchesDates = rStart <= filterEndDate;
			}
		}

		return matchesSearch && matchesStatus && matchesDates;
	}));

	let availableStatuses = $derived(Array.from(new Set(reservations.map(r => r.status))));

	// Pagination
	let page = $state(1);
	let pageSize = $state(10);
	let paginatedReservations = $derived(filteredReservations.slice((page - 1) * pageSize, page * pageSize));
	let totalPages = $derived(Math.ceil(filteredReservations.length / pageSize) || 1);
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

	function formatDateShort(dateStr: string) {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
	}

	async function loadAll() {
		loading = true;
		try {
			reservations = await getAdminReservations();
			error = null;
			page = 1; // Reset to page 1 on reload
		} catch (err: any) {
			error = err.message;
			toast.error('Error al cargar datos: ' + err.message);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'reservations', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await loadAll();
	});

	function openCreate() {
		goto('/admin/reservaciones/nueva');
	}

	function openEdit(r: ReservationRead) {
		goto(`/admin/reservaciones/${r.id}/editar`);
	}

	function openDetails(r: ReservationRead) {
		goto(`/admin/reservaciones/${r.id}/detalle`);
	}

	async function handleDelete(r: ReservationRead) {
		if (!confirm(`¿Eliminar definitivamente la reservación ${r.unique_id}? No se puede deshacer.`)) return;
		try {
			await deleteAdminReservation(r.id);
			toast.success(`Reservación eliminada`);
			await loadAll();
		} catch (e: any) {
			toast.error(e.message || 'Error al eliminar');
		}
	}
</script>

<svelte:head>
	<title>Admin - Reservaciones</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Reservaciones</h1>
			<p class="admin-desc">Gestión completa de las reservaciones (Crear, Editar, Eliminar, Pagar).</p>
		</div>
		<div class="admin-toolbar flex-wrap">
			<div class="flex flex-1 gap-3 items-center min-w-[250px]">
				<div class="relative flex-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input type="text" placeholder="Buscar por código, nombre o email..." bind:value={searchQuery} oninput={() => page = 1} class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter']" />
				</div>
				<select bind:value={selectedStatus} onchange={() => page = 1} class="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter']">
					<option value="">Todos los estados</option>
					{#each availableStatuses as s}
						<option value={s} class="uppercase">{s}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 bg-white dark:bg-slate-800 dark:border-slate-700 transition-all font-['Inter']">
				<span class="text-slate-400 text-[10px] font-bold uppercase ml-1">Desde</span>
				<input type="date" bind:value={filterStartDate} onchange={() => page = 1} class="border-none bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 p-0 h-[22px]" />
			</div>
			<div class="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 bg-white dark:bg-slate-800 dark:border-slate-700 transition-all font-['Inter']">
				<span class="text-slate-400 text-[10px] font-bold uppercase ml-1">Hasta</span>
				<input type="date" bind:value={filterEndDate} onchange={() => page = 1} class="border-none bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 p-0 h-[22px]" />
			</div>
			{#if filterStartDate || filterEndDate}
				<button type="button" class="action-icon-btn h-[34px] w-[34px] hover:bg-slate-200 dark:hover:bg-slate-700" onclick={clearDateFilter} title="Limpiar fechas">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
				</button>
			{/if}

			{#if hasPermission($authStore.user, 'reservations', 'create')}
				<button type="button" class="admin-btn py-2.5" onclick={openCreate}>Nueva Reservación</button>
			{/if}
		</div>
	</div>

	{#if error && !loading}
		<div class="admin-error">{error}</div>
	{/if}

	<section class="admin-section">
		{#if loading}
			<p class="admin-loading">Cargando datos...</p>
		{:else if reservations.length === 0}
			<p class="admin-hint">No hay reservaciones registradas en el sistema.</p>
		{:else}
			<div class="admin-table-wrapper">
				<table class="admin-table">
					<thead>
						<tr>
							<th>Código</th>
							<th>Usuario (ID)</th>
							<th>Habitación</th>
							<th>Fechas</th>
							<th>Estado</th>
							<th>Total</th>
							<th>Pagado</th>
							<th>Saldo</th>
							<th>Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredReservations.length === 0}
							<tr>
								<td colspan="9" class="text-center py-6 text-slate-500">No se encontraron reservaciones para estos filtros.</td>
							</tr>
						{:else}
							{#each paginatedReservations as res}
								<tr>
								<td class="whitespace-nowrap"><strong>{res.unique_id}</strong></td>
								<td class="whitespace-nowrap">
									<div class="flex flex-col">
										<span class="font-medium text-slate-900 dark:text-white max-w-[150px] truncate inline-block" title={res.user?.profile ? `${res.user.profile.first_name} ${res.user.profile.last_name}` : res.user?.email}>
											{res.user?.profile ? `${res.user.profile.first_name} ${res.user.profile.last_name}` : res.user?.email || 'N/A'}
										</span>
										<span class="text-[10px] text-slate-400">ID: #{res.user_id}</span>
									</div>
								</td>
								<td>
									<div class="flex flex-col">
										<span class="font-bold">#{res.room?.number}</span>
										<span class="text-[10px] uppercase opacity-60 font-bold">{res.room?.type}</span>
									</div>
								</td>
								<td class="whitespace-nowrap text-[11px] font-mono">
									{formatDateShort(res.check_in)} - {formatDateShort(res.check_out)}
								</td>
								<td>
									<span class="admin-badge {res.status === 'confirmed' && res.balance > 0 ? 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30' : ''} {res.balance < 0 ? 'bg-indigo-500/20 text-indigo-700 border-indigo-500/30' : ''}">
										{res.status}
										{#if res.status === 'confirmed' && res.balance > 0}
											<small class="ml-1 opacity-80 decoration-red-500 underline underline-offset-2">${res.balance}</small>
										{:else if res.balance < 0}
											<small class="ml-1 opacity-80 decoration-indigo-500 underline underline-offset-2">A favor ${Math.abs(res.balance)}</small>
										{/if}
									</span>
								</td>
								<td class="text-right font-mono font-bold text-slate-400">${res.total_cost}</td>
								<td class="text-right font-mono font-bold text-green-600">${res.total_paid || 0}</td>
								<td class="text-right font-mono font-bold {res.balance < 0 ? 'text-indigo-600' : (res.balance > 0 ? 'text-red-500' : 'text-slate-400')}">
									{res.balance < 0 ? `-$${Math.abs(res.balance)}` : `$${res.balance || 0}`}
								</td>
								<td class="whitespace-nowrap">
									<div class="flex justify-center gap-1">
										<button type="button" class="action-icon-btn" onclick={() => openDetails(res)} title="Ver detalles">
											<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
										</button>
										{#if hasPermission($authStore.user, 'reservations', 'update')}
											<button type="button" class="action-icon-btn" onclick={() => openEdit(res)} title="Editar">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
											</button>
										{/if}
										{#if hasPermission($authStore.user, 'reservations', 'delete')}
											<button type="button" class="action-icon-btn danger" onclick={() => handleDelete(res)} title="Eliminar">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
											</button>
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
					<span>Mostrando {filteredReservations.length} reservación(es)</span>
					<div class="admin-page-size">
						<label for="page-size-reservations" class="text-sm">Filas:</label>
						<select id="page-size-reservations" value={pageSize} onchange={setPageSize}>
							<option value="10">10</option>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</select>
					</div>
				</div>

				<div class="admin-pagination-right">
					<button type="button" class="admin-btn-secondary" onclick={prevPage} disabled={!hasPrevPage}>
						Anterior
					</button>
					<span class="admin-pagination-info">Página {page} de {totalPages}</span>
					<button type="button" class="admin-btn-secondary" onclick={nextPage} disabled={!hasNextPage}>
						Siguiente
					</button>
				</div>
			</div>
		{/if}
	</section>
</div>
{/if}


