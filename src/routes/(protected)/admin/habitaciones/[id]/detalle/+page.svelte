<script lang="ts">
	import { page as sveltePage } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getRoom, getRoomPriceHistory, searchRooms } from '$lib/services/room.service';
	import type { RoomRead, SeasonPriceRead, RoomPriceHistoryResponse } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';
	import ImageLightboxModal from '$lib/components/admin/ImageLightboxModal.svelte';
	import RoomPriceProjection from '$lib/components/admin/RoomPriceProjection.svelte';
	import RoomUpcomingReservations from '$lib/components/admin/RoomUpcomingReservations.svelte';
	import '../../../adminPage.css';

	let id = $derived(Number($sveltePage.params.id));
	let room = $state<RoomRead | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Auditoría / Time Machine
	let showHistory = $state(true); // Mostrar por defecto en la página dedicada
	let priceHistory: RoomPriceHistoryResponse | null = $state(null);
	let loadingHistory = $state(false);
	let targetDate = $state((() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    })()); // Fecha local de hoy por defecto

	let showImageModal = $state(false);
	let currentImageIndex = $state(0);
	let isAvailableToday = $state<boolean | null>(null);
	let loadingAvailability = $state(false);

	let computedPriceBreakdown = $derived.by(() => {
		if (!targetDate || !priceHistory || !room) return null;
		
		const targetStr = targetDate;
		const targetD = new Date(targetStr + 'T23:59:59');

		const activeSeasons = (priceHistory.season_prices || []).filter(sp => 
			sp.start_date <= targetStr && sp.end_date >= targetStr
			&& new Date(sp.created_at || '') <= targetD
		).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
		
		const activeSp = activeSeasons.length > 0 ? activeSeasons[0] : null;

		const activeBasePrices = (priceHistory.base_prices || []).filter(bp => 
			new Date(bp.created_at || '') <= targetD
		).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
		
		const basePriceUsed = activeBasePrices.length > 0 ? Number(activeBasePrices[0].base_price) : Number(room.base_price);

		if (activeSp) {
			return {
				total: (basePriceUsed * Number(activeSp.price_multiplier)).toFixed(2),
				base: basePriceUsed.toFixed(2),
				multiplier: activeSp.price_multiplier,
				seasonName: activeSp.description || 'Temporada Dinámica',
				type: 'season'
			};
		}

		return {
			total: basePriceUsed.toFixed(2),
			base: basePriceUsed.toFixed(2),
			multiplier: 1,
			seasonName: null,
			type: 'base'
		};
	});

	async function loadRoomDetails() {
		loading = true;
		try {
			room = await getRoom(id);
			
			// Cargar historial automáticamente
			loadingHistory = true;
			priceHistory = await getRoomPriceHistory(id);

			// Consultar disponibilidad para HOY
			loadingAvailability = true;
			const now = new Date();
			const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			
			const tom = new Date(now);
			tom.setDate(now.getDate() + 1);
			const tomStr = `${tom.getFullYear()}-${String(tom.getMonth() + 1).padStart(2, '0')}-${String(tom.getDate()).padStart(2, '0')}`;
			
			const search = await searchRooms(todayStr, tomStr, 1);
			const found = search.find(r => r.room.id === id);
			isAvailableToday = found ? found.is_available : false;

		} catch (err: any) {
			error = err.message;
			toast.error(error);
		} finally {
			loading = false;
			loadingHistory = false;
			loadingAvailability = false;
		}
	}

	onMount(loadRoomDetails);

	function openImage(index: number) {
		currentImageIndex = index;
		showImageModal = true;
	}

	function handleBack() {
		goto('/admin/habitaciones');
	}

	function goToEdit() {
		goto(`/admin/habitaciones/${id}`);
	}
</script>

<svelte:head>
	<title>Admin - Detalle Habitación {room?.number || ''}</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20">
    <!-- Navegación y Breadcrumbs -->
    <div class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                <a href="/admin/habitaciones" class="hover:text-amber-600 transition-colors">Habitaciones</a>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="text-slate-900 dark:text-slate-200">Visor de Detalles</span>
                {#if room}
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span class="text-amber-600 font-bold">#{room.number}</span>
                {/if}
            </nav>
            
            <button class="group flex items-center gap-3 text-slate-500 hover:text-amber-600 transition-all" onclick={handleBack}>
                <div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <span class="text-xs font-black uppercase tracking-widest">Regresar</span>
            </button>
        </div>

        {#if room}
            <div class="flex items-center gap-3">
                <div class="text-right mr-4 hidden sm:block">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Operativo</p>
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter {room.is_active ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}">
                        {room.is_active ? 'Activa' : 'Desconectada'}
                    </span>
                </div>
                <button class="admin-btn-secondary px-6 !py-3" onclick={goToEdit}>
                    Editar Configuración
                </button>
            </div>
        {/if}
    </div>

    {#if loading}
        <div class="flex flex-col items-center justify-center p-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Sincronizando datos de propiedad...</p>
        </div>
    {:else if error}
        <div class="p-10 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[32px] text-center">
            <p class="text-red-600 dark:text-red-400 font-bold mb-4">{error}</p>
            <button class="admin-btn" onclick={loadRoomDetails}>Reintentar</button>
        </div>
    {:else if room}
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- Columna Izquierda: Visual y Técnica (7/12) -->
            <div class="lg:col-span-7 space-y-8">
                         <!-- Card: Información Detallada -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <div class="flex items-center gap-3 mb-8">
                        <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        </div>
                        <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Información General</h2>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div class="col-span-full flex gap-6 pb-6 border-b border-slate-50 dark:border-slate-800/50">
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Identificador</p>
                                <p class="text-sm font-bold text-slate-700 dark:text-slate-200">Habitación {room.number}</p>
                            </div>
                            <div class="pl-6 border-l border-slate-200 dark:border-slate-800">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</p>
                                <p class="text-sm font-bold text-slate-700 dark:text-slate-200">{room.type}</p>
                            </div>
                            <div class="pl-6 border-l border-slate-200 dark:border-slate-800">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Hoy</p>
                                {#if loadingAvailability}
                                    <div class="h-5 w-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md"></div>
                                {:else}
                                    <span class="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight {isAvailableToday ? 'text-emerald-500' : 'text-rose-500'}">
                                        <span class="w-1.5 h-1.5 rounded-full {isAvailableToday ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}"></span>
                                        {isAvailableToday ? 'Libre' : 'Ocupada'}
                                    </span>
                                {/if}
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div>
                                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Descripción General</h3>
                                <p class="text-slate-600 dark:text-slate-300 leading-relaxed text-sm italic">
                                    "{room.description || 'Sin descripción especial configurada para esta unidad.'}"
                                </p>
                            </div>
                            
                            <div class="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div class="flex-1">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ocupación Máxima</p>
                                    <p class="text-2xl font-black text-slate-800 dark:text-white">{room.capacity} <span class="text-sm font-medium text-slate-500">Huéspedes</span></p>
                                </div>
                                <div class="w-12 h-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                                    <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75" stroke-width="2"/></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Amenidades Incluidas</h3>
                            <div class="flex flex-wrap gap-2">
                                {#if room.amenities && room.amenities.length > 0}
                                    {#each room.amenities as am}
                                        <span class="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2">
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                            {am.name}
                                        </span>
                                    {/each}
                                {:else}
                                    <p class="text-xs text-slate-400 italic">No se han definido amenidades técnicas.</p>
                                {/if}
                            </div>
                        </div>
                    </div>
                </section>
                
                {#if room && priceHistory}
                    <div class="space-y-8 mb-8">
                        <RoomUpcomingReservations roomId={id} />
                    </div>
                {/if}

                <!-- Card: Galería de Fotos -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2v12a2 2 0 002 2z"/></svg>
                            </div>
                            <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Multimedia</h2>
                        </div>
                        <span class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{room.images?.length || 0} Archivos</span>
                    </div>

                    {#if room.images && room.images.length > 0}
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {#each room.images as img, i}
                                <button type="button" class="group relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-[28px] overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in transition-all hover:shadow-xl hover:scale-[1.02]" onclick={() => openImage(i)}>
                                    <img src="{img.url}" alt="Foto habitación" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <span class="text-white text-[10px] font-bold uppercase tracking-widest">Ver en Pantalla Completa</span>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    {:else}
                        <div class="p-20 bg-slate-50/50 dark:bg-slate-950/20 rounded-[32px] text-center border border-dashed border-slate-200 dark:border-slate-800">
                            <span class="text-5xl block mb-4 opacity-10">📷</span>
                            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Sin material multimedia</p>
                        </div>
                    {/if}
                </section>
            </div>

            <!-- Columna Derecha: Auditoría y Precios (5/12) -->
            <aside class="lg:col-span-5 space-y-8 lg:sticky lg:top-8">
                
                <!-- Card: Precios Actuales y Futuros -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke-width="2" stroke-linecap="round"/></svg>
                            </div>
                            <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide italic">Time Machine</h2>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Base</p>
                            <p class="text-xl font-black text-slate-900 dark:text-white tracking-tighter">${room.base_price}</p>
                        </div>
                    </div>

                    <!-- Buscador de Auditoría -->
                    <div class="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-inner">
                        <label class="text-[10px] font-black text-slate-500 dark:text-slate-400 mb-4 block uppercase tracking-[0.15em]">Consultar precio oficial en fecha:</label>
                        <div class="flex flex-col gap-4">
                            <input type="date" bind:value={targetDate} class="w-full !bg-white dark:!bg-slate-900 dark:text-white !rounded-2xl !border-transparent !shadow-sm !py-3 !px-5 focus:!ring-[#D4AF37]/30 transition-all font-black" />
                            
                            {#if computedPriceBreakdown !== null}
                                <div class="mt-2 text-center p-6 bg-amber-500 rounded-[28px] shadow-lg shadow-amber-500/20 text-white animate-pulse-subtle">
                                    <p class="text-[10px] font-black uppercase tracking-[0.3em] mb-1 opacity-80">Tarifa Vigente Oficial</p>
                                    <p class="text-5xl font-black tracking-tighter">${computedPriceBreakdown.total}</p>
                                    
                                    <div class="mt-3 flex items-center justify-center gap-2">
                                        <div class="px-3 py-1 bg-white/20 rounded-full text-[9px] font-bold">
                                            Base: ${computedPriceBreakdown.base}
                                        </div>
                                        {#if computedPriceBreakdown.type === 'season'}
                                            <div class="flex items-center gap-1 text-[9px] font-bold">
                                                <span>⨯</span>
                                                <span class="px-3 py-1 bg-emerald-400 text-slate-900 rounded-full">
                                                    {computedPriceBreakdown.multiplier} ({computedPriceBreakdown.seasonName})
                                                </span>
                                            </div>
                                        {/if}
                                    </div>

                                    <p class="text-[10px] font-medium uppercase tracking-widest mt-4 opacity-70 border-t border-white/10 pt-3">
                                        {(() => {
                                            const [y, m, d] = targetDate.split('-').map(Number);
                                            return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                        })()}
                                    </p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Listado de Temporadas -->
                    <div class="mt-10">
                        <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Reglas Dinámicas Aplicadas</h3>
                        <div class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {#if room.season_prices && room.season_prices.length > 0}
                                {#each room.season_prices as season}
                                    <div class="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col gap-3 group hover:border-amber-500/20 transition-all">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <p class="font-bold text-slate-800 dark:text-slate-200 text-sm">{season.description || 'Temporada Dinámica'}</p>
                                                <div class="flex items-center gap-2 mt-1">
                                                    <span class="text-[10px] text-slate-400 font-medium">{season.start_date} al {season.end_date}</span>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <span class="text-[10px] font-black px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg">x{season.price_multiplier}</span>
                                                <p class="text-xs font-black text-slate-800 dark:text-white mt-1.5">${(room.base_price * season.price_multiplier).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            {:else}
                                <p class="text-center py-10 text-xs text-slate-400 italic">No existen temporadas dinámicas asociadas.</p>
                            {/if}
                        </div>
                    </div>
                </section>

                <!-- NUEVO: Módulos Analíticos Avanzados -->
                {#if room && priceHistory}
                    <RoomPriceProjection {room} {priceHistory} />
                {/if}

                <!-- Card: Historial de Auditoría Interna (Logs) -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Bitácora de Cambios Administrativos</h3>
                    
                    <div class="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {#if loadingHistory}
                            <div class="flex items-center justify-center py-10">
                                <div class="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                            </div>
                        {:else if !priceHistory || (priceHistory.season_prices.length === 0 && priceHistory.base_prices.length === 0)}
                            <p class="text-center text-[10px] text-slate-400 uppercase tracking-widest py-10 italic">Archivo histórico vacío</p>
                        {:else}
                            {@const combinedHistory = [
                                ...(priceHistory.season_prices || []).map(sp => ({ type: 'season', date: new Date(sp.created_at || 0), data: sp })),
                                ...(priceHistory.base_prices || []).map(bp => ({ type: 'base', date: new Date(bp.created_at || 0), data: bp }))
                            ].sort((a, b) => b.date.getTime() - a.date.getTime())}

                            {#each combinedHistory as item}
                                <div class="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-[9px] font-black uppercase tracking-wider {item.type === 'season' ? 'text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded' : 'text-indigo-600 bg-indigo-500/5 px-2 py-0.5 rounded'}">
                                            {item.type === 'season' ? 'Multiplicador' : 'Ajuste Base'}
                                        </span>
                                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter" title="Fecha registro">
                                            {item.date.toLocaleDateString()}
                                        </span>
                                    </div>
                                    
                                    {#if item.type === 'season'}
                                        <div class="flex justify-between items-center">
                                            <p class="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{item.data.description || 'Sin nota'}</p>
                                            <span class="text-xs font-black text-slate-900 dark:text-white">${((item.data.snapshot_base_price ?? room.base_price) * item.data.price_multiplier).toFixed(2)}</span>
                                        </div>
                                    {:else}
                                        <div class="flex justify-between items-center">
                                            <p class="text-xs font-medium text-slate-700 dark:text-slate-300">Nuevo precio unitario</p>
                                            <span class="text-xs font-black text-slate-900 dark:text-white">${Number(item.data.base_price).toFixed(2)}</span>
                                        </div>
                                    {/if}
                                </div>
                            {/each}
                        {/if}
                    </div>
                </section>
            </aside>
        </div>
    {/if}
</div>

<ImageLightboxModal 
	bind:show={showImageModal} 
	images={room?.images || []} 
	bind:currentIndex={currentImageIndex} 
/>

<style>
    @keyframes pulse-subtle {
        0% { transform: scale(1); box-shadow: 0 10px 15px -3px rgba(212, 175, 55, 0.2); }
        50% { transform: scale(1.01); box-shadow: 0 20px 25px -5px rgba(212, 175, 55, 0.3); }
        100% { transform: scale(1); box-shadow: 0 10px 15px -3px rgba(212, 175, 55, 0.2); }
    }
    .animate-pulse-subtle {
        animation: pulse-subtle 4s infinite ease-in-out;
    }
</style>
