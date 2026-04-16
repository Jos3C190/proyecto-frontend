<script lang="ts">
	import { getAdminRooms, deleteRoom, getAdminRoomTypes, searchRooms } from '$lib/services/room.service';
	import type { RoomRead, RoomTypeRead } from '$lib/types/room';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { toast } from '$lib/stores/toast.svelte';
	import RoomDetailsModal from '$lib/components/admin/RoomDetailsModal.svelte';
	import RoomTypesModal from '$lib/components/admin/RoomTypesModal.svelte';
	import ImageLightboxModal from '$lib/components/admin/ImageLightboxModal.svelte';
	import '../adminPage.css';

	let rooms = $state<RoomRead[]>([]);
	let roomTypes = $state<RoomTypeRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	let hasAccess = $derived(hasPermission($authStore.user, 'rooms', 'read'));

	let showDetails = $state(false);
	let showImageModal = $state(false);
	let showRoomTypesModal = $state(false);
	let currentImageIndex = $state(0);
	let viewingRoom = $state<RoomRead | null>(null);

	// Filters
	let searchQuery = $state('');
	let selectedType = $state('');

	let availCheckIn = $state('');
	let availCheckOut = $state('');
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
	let page = $state(1);
	let pageSize = $state(10);
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
			page = 1; // Reset to page 1 on reload
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
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
		viewingRoom = r;
		showDetails = true;
	}

	async function handleDelete(id: number) {
		if (!confirm('¿Seguro de eliminar esta habitación?')) return;
		try {
			await deleteRoom(id);
			toast.success('Habitación eliminada correctamente');
			await loadRooms();
		} catch (err: any) {
			toast.error(err.message);
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
		<div class="admin-toolbar flex-wrap">
			<div class="flex flex-1 gap-3 items-center min-w-[250px]">
				<div class="relative flex-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
					<input type="text" placeholder="Buscar por número o ref..." bind:value={searchQuery} oninput={() => page = 1} class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter']" />
				</div>
				<select bind:value={selectedType} onchange={() => page = 1} class="text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-all font-['Inter']">
					<option value="">Todos los tipos</option>
					{#each roomTypes as t}
						<option value={t.name}>{t.name}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 bg-white dark:bg-slate-800 dark:border-slate-700 transition-all">
				<span class="text-slate-400 text-[10px] font-bold uppercase ml-1">Libre (In)</span>
				<input type="date" bind:value={availCheckIn} onchange={filterAvailability} class="border-none bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 p-0 h-[22px]" />
			</div>
			<div class="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 bg-white dark:bg-slate-800 dark:border-slate-700 transition-all">
				<span class="text-slate-400 text-[10px] font-bold uppercase ml-1">Libre (Out)</span>
				<input type="date" bind:value={availCheckOut} onchange={filterAvailability} class="border-none bg-transparent outline-none text-xs text-slate-700 dark:text-slate-200 p-0 h-[22px]" />
			</div>
			{#if availableRoomsIds !== null || isFilteringAvail}
				<button type="button" class="action-icon-btn h-[34px] w-[34px] hover:bg-slate-200 dark:hover:bg-slate-700" onclick={clearDateFilter} title="Limpiar filtro de fechas" disabled={isFilteringAvail}>
					{#if isFilteringAvail}
						<svg class="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
					{:else}
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
					{/if}
				</button>
			{/if}

			<button class="admin-btn py-2.5" onclick={openCreate}>Nueva Habitación</button>
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
							<th>ID</th>
							<th>Número</th>
							<th>Tipo</th>
							<th>Capacidad</th>
							<th>Precio Base</th>
							<th>Estado</th>
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
								<tr>
									<td>{r.id}</td>
								<td><strong>{r.number}</strong></td>
								<td><span class="admin-badge">{r.type}</span></td>
								<td>{r.capacity} personas</td>
								<td><strong style="color: #D4AF37;">${r.base_price}</strong></td>
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

<RoomDetailsModal 
	bind:show={showDetails} 
	room={viewingRoom} 
	onOpenImage={openImage} 
/>

<RoomTypesModal 
	bind:show={showRoomTypesModal} 
	bind:roomTypes={roomTypes} 
/>

<ImageLightboxModal 
	bind:show={showImageModal} 
	images={viewingRoom?.images || []} 
	bind:currentIndex={currentImageIndex} 
/>
{/if}
