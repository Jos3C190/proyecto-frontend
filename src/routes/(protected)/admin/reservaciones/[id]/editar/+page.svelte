<script lang="ts">
	import { page as sveltePage } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { 
        getReservation,
        updateAdminReservation 
    } from '$lib/services/reservation.service';
	import { searchRooms } from '$lib/services/room.service';
	import type { ReservationRead, AdminReservationUpdate } from '$lib/types/reservation';
	import type { RoomSearchResponse } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import '../../../adminPage.css';

	let id = $derived(Number($sveltePage.params.id));
	let reservation = $state<ReservationRead | null>(null);
	let loading = $state(true);
	let formLoading = $state(false);

	let editData = $state({
		status: '',
		guests: 1,
		room_id: '',
		check_in: '',
		check_out: ''
	});

	let availableRooms = $state<RoomSearchResponse[]>([]);
	let searchPerformed = $state(false);
	let isSearching = $state(false);

	const todayDate = new Date();
	const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

	let minCheckIn = $derived(reservation && reservation.check_in < todayStr ? reservation.check_in : todayStr);

	let nightsCount = $derived.by(() => {
		if (!editData.check_in || !editData.check_out) return 0;
		const s = new Date(editData.check_in);
		const e = new Date(editData.check_out);
		const diff = e.getTime() - s.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	});

	async function handleSearchRooms() {
		if (!editData.check_in || !editData.check_out || !editData.guests) {
			toast.error('Completa las fechas y huéspedes para buscar.');
			return;
		}
		isSearching = true;
		searchPerformed = false;
		try {
			let results = await searchRooms(editData.check_in, editData.check_out, editData.guests);
			
			// Si la habitación actual no está en los resultados, la inyectamos
			// Esto permite que el usuario la vea y la mantenga si solo está editando otros campos.
			const currentRoomId = reservation?.room.id;
			const isAlreadyInResults = results.some(r => r.room.id === currentRoomId);

			if (!isAlreadyInResults && reservation) {
				const nights = (() => {
					const s = new Date(editData.check_in);
					const e = new Date(editData.check_out);
					const diff = e.getTime() - s.getTime();
					return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
				})();

				results = [{
					room: reservation.room,
					total_price: editData.check_in === reservation.check_in && editData.check_out === reservation.check_out 
						? reservation.total_cost 
						: (reservation.room.base_price * nights),
					nights: nights,
					isCurrent: true
				} as any, ...results];
			}

			availableRooms = results;
			searchPerformed = true;
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			isSearching = false;
		}
	}

	async function loadReservationData() {
		loading = true;
		try {
            const res = await getReservation(id);
			reservation = res;
            
            editData = {
				status: res.status,
				guests: res.guests,
				room_id: res.room.id.toString(),
				check_in: res.check_in,
				check_out: res.check_out
			};

			await handleSearchRooms();
		} catch (err: any) {
			toast.error('Error al cargar datos: ' + err.message);
		} finally {
			loading = false;
		}
	}

	async function handleEdit(e: Event) {
		e.preventDefault();
		if (!reservation) return;
		if (!editData.room_id) {
			toast.error('Debes seleccionar una habitación del inventario disponible.');
			return;
		}
		formLoading = true;

		try {
			const payload: AdminReservationUpdate = {
				status: editData.status,
				room_id: Number(editData.room_id),
				guests: Number(editData.guests),
				check_in: editData.check_in,
				check_out: editData.check_out
			};
			await updateAdminReservation(reservation.id, payload);
			toast.success(`Reservación actualizada exitosamente`);
			goto(`/admin/reservaciones/${id}/detalle`);
		} catch (e: any) {
			toast.error(e.message || 'Error al actualizar');
		} finally {
			formLoading = false;
		}
	}

	onMount(() => {
		if (!hasPermission($authStore.user, 'reservations', 'update')) {
			goto('/admin/reservaciones');
			return;
		}
		loadReservationData();
	});
</script>

<svelte:head>
	<title>Editar Reservación {reservation?.unique_id || ''}</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20">
    <div class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                <a href="/admin/reservaciones" class="hover:text-[#D4AF37] transition-colors">Reservaciones</a>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <a href="/admin/reservaciones/{id}/detalle" class="hover:text-[#D4AF37] transition-colors">Detalle</a>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="text-[#D4AF37] font-bold">Editar</span>
            </nav>

            <button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-6" onclick={() => goto('/admin/reservaciones')}>
                <div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <span class="text-xs font-black uppercase tracking-widest">Listado Global</span>
            </button>

            <h1 class="admin-title">Editar Reservación</h1>
            <p class="admin-desc">Ajusta los criterios de estancia y reasigna habitaciones si es necesario.</p>
        </div>
    </div>

    {#if loading}
        <div class="flex flex-col items-center justify-center p-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6"></div>
            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando datos de la reserva...</p>
        </div>
    {:else if reservation}
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-12">
                <div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                    <form onsubmit={handleEdit} class="space-y-8">
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div class="admin-field">
                                <label for="e-in">Check-in</label>
                                <input id="e-in" type="date" min={minCheckIn} bind:value={editData.check_in} onchange={() => searchPerformed = false} required />
                            </div>
                            <div class="admin-field">
                                <label for="e-out">Check-out</label>
                                <input id="e-out" type="date" min={editData.check_in || minCheckIn} bind:value={editData.check_out} onchange={() => searchPerformed = false} required />
                            </div>
                            <div class="admin-field">
                                <label for="e-guests">Huéspedes</label>
                                <input id="e-guests" type="number" min="1" bind:value={editData.guests} onchange={() => searchPerformed = false} required />
                            </div>
                            <div class="admin-field">
                                <label for="e-status">Estado</label>
                                <select id="e-status" bind:value={editData.status} required>
                                    {#if reservation.status === 'pending'}
                                        <option value="pending">Pendiente</option>
                                    {:else if reservation.status === 'confirmed'}
                                        <option value="confirmed">Confirmada</option>
                                    {/if}
                                    <option value="cancelled">Cancelada</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex justify-end pt-4 gap-4 border-t border-slate-50 dark:border-slate-800">
                            <button type="button" class="admin-btn-secondary px-8 !py-3 hover:!bg-rose-500/5 hover:!text-rose-500 hover:!border-rose-500/20" onclick={() => goto('/admin/reservaciones')}>Descartar Cambios</button>
                            <button type="button" class="admin-btn-secondary px-8 !py-3" onclick={handleSearchRooms} disabled={isSearching}>
                                {isSearching ? 'Buscando Disponibilidad...' : 'Consultar Disponibilidad'}
                            </button>
                            {#if searchPerformed || editData.room_id}
                                <button type="submit" class="admin-btn px-10" disabled={!editData.room_id || formLoading}>
                                    {formLoading ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            {/if}
                        </div>
                    </form>
                </div>

                {#if searchPerformed}
                    <div class="mt-8 space-y-6 fade-in">
                        <div class="flex items-center gap-4 mb-2">
                            <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Inventario Disponible para Reasignación</h3>
                            <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                        </div>

                        {#if availableRooms.length === 0}
                            <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-10 rounded-[32px] text-center">
                                <p class="text-sm text-amber-700 dark:text-amber-500 font-bold italic">No hay otras unidades disponibles para estas fechas. Puedes mantener la actual si no cambias los criterios.</p>
                            </div>
                        {:else}
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {#each availableRooms as res}
                                    {@const isSelected = editData.room_id == res.room.id.toString()}
                                    <button 
                                        type="button" 
                                        class="group relative flex flex-col overflow-hidden rounded-[28px] border-2 transition-all duration-300 text-left bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl {isSelected ? 'border-[#D4AF37] ring-4 ring-[#D4AF37]/10' : 'border-slate-100 dark:border-slate-800 hover:border-[#D4AF37]/30'}"
                                        onclick={() => editData.room_id = res.room.id.toString()}
                                    >
                                        <div class="aspect-[16/9] w-full overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                                            {#if res.room.cover_image_url}
                                                <img src={res.room.cover_image_url} alt="Habitación {res.room.number}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            {:else}
                                                <div class="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                                    <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke-width="1.5"/><path d="M9 22V12h6v10" stroke-width="1.5"/></svg>
                                                    <span class="text-[10px] font-black uppercase tracking-widest">Sin imagen</span>
                                                </div>
                                            {/if}
                                            
                                            <div class="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2">
                                                <span class="text-white text-[11px] font-black uppercase tracking-tight">Suite {res.room.number}</span>
                                                {#if res.isCurrent}
                                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                    <span class="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Actual</span>
                                                {/if}
                                            </div>

                                            {#if isSelected}
                                                <div class="absolute inset-0 bg-[#D4AF37]/20 backdrop-blur-[2px] flex items-center justify-center fade-in">
                                                    <div class="w-12 h-12 rounded-full bg-white text-[#D4AF37] flex items-center justify-center shadow-2xl scale-110 animate-bounce-short">
                                                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                    </div>
                                                </div>
                                            {/if}
                                        </div>

                                        <div class="p-5 flex-1 flex flex-col">
                                            <div class="flex justify-between items-start mb-2">
                                                <span class="text-[9px] font-black uppercase tracking-widest text-[#AA8222] bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded leading-none">{res.room.type}</span>
                                                <div class="flex items-center gap-1 text-slate-400">
                                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-width="2"/></svg>
                                                    <span class="text-[10px] font-bold">{res.room.capacity} Pax</span>
                                                </div>
                                            </div>
                                            
                                            <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic mb-4 flex-1">
                                                "{res.room.description || 'Una estancia de lujo diseñada para su confort.'}"
                                            </p>

                                            <div class="flex justify-between items-end pt-4 border-t border-slate-50 dark:border-slate-800">
                                                <div>
                                                    <div class="flex items-baseline gap-1.5 mb-0.5">
                                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Estancia Total</p>
                                                        {#if nightsCount > 0}
                                                            <span class="text-[9px] font-black text-[#D4AF37]">·</span>
                                                            <p class="text-[9px] font-bold text-[#AA8222]">${(res.total_price / nightsCount).toFixed(2)} / noche</p>
                                                        {/if}
                                                    </div>
                                                    <p class="text-xl font-black text-slate-900 dark:text-white tracking-tight">${res.total_price}</p>
                                                </div>
                                                <div class="pb-1">
                                                    <span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">Disponible</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
