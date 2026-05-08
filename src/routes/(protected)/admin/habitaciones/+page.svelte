<script lang="ts">
	import { getAdminRooms, deleteRoom, getAdminRoomTypes, searchRooms } from '$lib/services/room.service';
	import type { RoomRead, RoomTypeRead } from '$lib/types/room';
	import { onMount } from 'svelte';
	import { getElSalvadorDate, getElSalvadorTomorrow } from '$lib/utils/date';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { toast } from '$lib/stores/toast.svelte';
	import RoomTypesModal from '$lib/components/admin/RoomTypesModal.svelte';
	import ImageLightboxModal from '$lib/components/admin/ImageLightboxModal.svelte';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import '../adminPage.css';

	const persistence = createPersistence({
		key: 'admin_rooms',
		defaultValues: {
			page: 1,
			pageSize: 10,
			searchQuery: '',
			selectedType: '',
			availCheckIn: '',
			availCheckOut: ''
		}
	});

	const initialState = persistence.getInitialState();

	let rooms = $state<RoomRead[]>([]);
	let roomTypes = $state<RoomTypeRead[]>([]);
	let loading = $state(true);
	let isDeleteModalOpen = $state(false);
	let roomIdToDelete = $state<number | null>(null);
	let actionLoading = $state(false);
	let error = $state<string | null>(null);
	
	let page = $state(initialState.page);
	let pageSize = $state(initialState.pageSize);
	let searchQuery = $state(initialState.searchQuery);
	let selectedType = $state(initialState.selectedType);
	let availCheckIn = $state(initialState.availCheckIn);
	let availCheckOut = $state(initialState.availCheckOut);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			page,
			pageSize,
			searchQuery,
			selectedType,
			availCheckIn,
			availCheckOut
		});
	});

	let hasAccess = $derived(hasPermission($authStore.user, 'rooms', 'read'));

	let showImageModal = $state(false);
	let showRoomTypesModal = $state(false);
	let currentImageIndex = $state(0);
	let viewingRoom = $state<RoomRead | null>(null);

	let isFilteringAvail = $state(false);
	let availableRoomsIds = $state<number[] | null>(null);

	let filteredRooms = $derived(rooms.filter(r => {
		const matchesSearch = searchQuery.trim() === '' || 
			r.number.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
			(r.description && r.description.toLowerCase().includes(searchQuery.trim().toLowerCase()));
		const matchesType = selectedType === '' || r.type === selectedType;
		const matchesAvail = availableRoomsIds === null || availableRoomsIds.includes(r.id);
		return matchesSearch && matchesType && matchesAvail;
	}));

	async function filterAvailability() {
		if (!availCheckIn || !availCheckOut) {
			availableRoomsIds = null;
			return;
		}
		const inD = new Date(availCheckIn);
		const outD = new Date(availCheckOut);
		if (inD >= outD) {
			toast.error("La fecha de salida debe ser posterior a la de entrada.");
			availableRoomsIds = null;
			return;
		}
		isFilteringAvail = true;
		page = 1;
		try {
			const results = await searchRooms(availCheckIn, availCheckOut, 1);
			availableRoomsIds = results.map(res => res.room.id);
		} catch (e: any) {
			toast.error(e.message || "Error al buscar disponibilidad.");
			availableRoomsIds = null;
		} finally {
			isFilteringAvail = false;
		}
	}

	function clearDateFilter() {
		availCheckIn = '';
		availCheckOut = '';
		availableRoomsIds = null;
		page = 1;
	}

	// Pagination
	let paginatedRooms = $derived(filteredRooms.slice((page - 1) * pageSize, page * pageSize));
	let totalPages = $derived(Math.ceil(filteredRooms.length / pageSize) || 1);
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

	async function loadRooms() {
		loading = true;
		try {
			const [roomsData, typesData] = await Promise.all([
				getAdminRooms(),
				getAdminRoomTypes()
			]);
			rooms = roomsData;
			roomTypes = typesData;

			// Verificar disponibilidad de hoy automáticamente
			checkTodayAvailability();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	let availableTodayIds = $state<number[]>([]);
	async function checkTodayAvailability() {
		const today = getElSalvadorDate();
		const tomorrow = getElSalvadorTomorrow();
		try {
			const results = await searchRooms(today, tomorrow, 1);
			availableTodayIds = results.map(res => res.room.id);
		} catch (e) {
			console.error("Error al verificar disponibilidad de hoy", e);
		}
	}

	function getTodayPrice(room: RoomRead) {
		const today = getElSalvadorDate();
		let multiplier = 1;
		
		// Encontrar si hay una temporada activa para hoy
		if (room.season_prices) {
			const activeSeason = room.season_prices.find(sp => 
				!sp.is_archived && today >= sp.start_date && today <= sp.end_date
			);
			if (activeSeason) {
				multiplier = activeSeason.price_multiplier;
			}
		}
		
		return {
			price: room.base_price * multiplier,
			hasSeason: multiplier !== 1
		};
	}

	onMount(() => {
		if (!hasPermission($authStore.user, 'rooms', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		loadRooms();
	});

	function openCreate() {
		goto('/admin/habitaciones/nueva');
	}

	function openEdit(r: RoomRead) {
		goto(`/admin/habitaciones/${r.id}`);
	}

	function openDetails(r: RoomRead) {
		goto(`/admin/habitaciones/${r.id}/detalle`);
	}

	async function handleDelete(id: number) {
		roomIdToDelete = id;
		isDeleteModalOpen = true;
	}

	async function confirmDelete() {
		if (roomIdToDelete === null) return;
		actionLoading = true;
		try {
			await deleteRoom(roomIdToDelete);
			toast.success('Habitación eliminada correctamente');
			isDeleteModalOpen = false;
			await loadRooms();
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			actionLoading = false;
		}
	}

	function openImage(index: number) {
		currentImageIndex = index;
		showImageModal = true;
	}
</script>

<svelte:head>
	<title>Admin - Habitaciones</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Habitaciones</h1>
			<p class="admin-desc">Gestiona el catálogo de habitaciones y sus precios.</p>
		</div>
		<div class="admin-toolbar">
			<div class="admin-search-wrapper">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				<input type="text" placeholder="Buscar por número o ref..." bind:value={searchQuery} oninput={() => page = 1} />
			</div>

			<div class="flex flex-wrap xl:flex-nowrap items-center gap-3">
				<div class="admin-filters !flex-nowrap">
					<div class="admin-input-group !gap-1.5 px-3">
						<span>IN</span>
						<input type="date" bind:value={availCheckIn} onchange={filterAvailability} class="!w-[85px] text-xs" />
						<span class="text-slate-300 dark:text-slate-600 font-light mx-1">/</span>
						<span>OUT</span>
						<input type="date" bind:value={availCheckOut} onchange={filterAvailability} class="!w-[85px] text-xs" />
						
						{#if availableRoomsIds !== null || isFilteringAvail}
							<button type="button" class="ml-1 text-slate-400 hover:text-red-500 transition-colors" onclick={clearDateFilter} title="Limpiar filtro de fechas" disabled={isFilteringAvail}>
								{#if isFilteringAvail}
									<svg class="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
								{/if}
							</button>
						{/if}
					</div>

					<select bind:value={selectedType} onchange={() => page = 1} class="!w-[130px]">
						<option value="">Cualquier tipo</option>
						{#each roomTypes as t}
							<option value={t.name}>{t.name}</option>
						{/each}
					</select>
				</div>

				<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
				<button class="admin-btn" onclick={openCreate}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					NUEVA
				</button>
			</div>
		</div>
	</div>

	{#if error}
		<div class="admin-error">{error}</div>
	{/if}

	<section class="admin-section">
		{#if loading}
			<p class="admin-loading">Cargando habitaciones...</p>
		{:else}
			<div class="admin-table-wrapper">
				<table class="admin-table">
					<thead>
						<tr>
							<th>Unidad</th>
							<th>Tipo</th>
							<th>Capacidad</th>
							<th>Ocupación (Hoy)</th>
							<th>Precio de Hoy</th>
							<th>Catálogo</th>
							<th>Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if paginatedRooms.length === 0}
							<tr>
								<td colspan="7" class="text-center py-6 text-slate-500">No se encontraron habitaciones.</td>
							</tr>
						{:else}
							{#each paginatedRooms as r}
								{@const todayPrice = getTodayPrice(r)}
								{@const isAvailableToday = availableTodayIds.includes(r.id)}
								<tr>
									<td>
										<div class="flex items-center gap-3">
											<div class="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 text-xs border border-slate-100 dark:border-slate-700">
												{r.number}
											</div>
											<strong class="text-slate-700 dark:text-slate-200">{r.type}</strong>
										</div>
									</td>
									<td><span class="admin-badge">{r.type}</span></td>
									<td>
										<div class="flex items-center gap-1.5 text-slate-500">
											<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-width="2.5"/></svg>
											<span>{r.capacity}</span>
										</div>
									</td>
									<td>
										{#if isAvailableToday}
											<div class="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full w-fit">
												<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
												Libre
											</div>
										{:else}
											<div class="flex items-center gap-1.5 text-rose-600 font-bold text-[10px] uppercase tracking-wider bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-full w-fit">
												<span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
												Ocupada
											</div>
										{/if}
									</td>
									<td>
										<div class="flex flex-col">
											<div class="flex items-center gap-2">
												<strong class="text-slate-900 dark:text-white text-base">${todayPrice.price}</strong>
												{#if todayPrice.hasSeason}
													<span class="w-1.5 h-1.5 rounded-full bg-amber-500" title="Precio de temporada activo"></span>
												{/if}
											</div>
											{#if todayPrice.hasSeason}
												<span class="text-[9px] text-slate-400 font-medium line-through">Base: ${r.base_price}</span>
											{:else}
												<span class="text-[9px] text-slate-400 font-medium uppercase tracking-widest">Base</span>
											{/if}
										</div>
									</td>
									<td>
										<span class={r.is_active ? 'admin-badge' : 'admin-badge-inactive'}>
											{r.is_active ? 'Activa' : 'Inactiva'}
										</span>
									</td>
									<td>
										<div class="flex justify-center gap-1">
											<button class="action-icon-btn" onclick={() => openDetails(r)} title="Ver detalles">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
											</button>
											<button class="action-icon-btn" onclick={() => openEdit(r)} title="Editar">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
											</button>
											<button class="action-icon-btn danger" onclick={() => handleDelete(r.id)} title="Eliminar">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
											</button>
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
					<span>Mostrando {filteredRooms.length} habitación(es)</span>
					<div class="admin-page-size">
						<label for="page-size-rooms" class="text-sm">Filas:</label>
						<select id="page-size-rooms" value={pageSize} onchange={setPageSize}>
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

<RoomTypesModal 
	bind:show={showRoomTypesModal} 
	bind:roomTypes={roomTypes} 
/>

<ImageLightboxModal 
	bind:show={showImageModal} 
	images={viewingRoom?.images || []} 
	bind:currentIndex={currentImageIndex} 
/>

<GenericConfirmModal
	isOpen={isDeleteModalOpen}
	title="Eliminar Habitación"
	message="¿Estás seguro de que deseas eliminar definitivamente esta habitación? Esta acción no se puede deshacer y afectará a futuras reservaciones."
	confirmText="Eliminar"
	variant="danger"
	onConfirm={confirmDelete}
	onClose={() => (isDeleteModalOpen = false)}
	loading={actionLoading}
/>
{/if}
