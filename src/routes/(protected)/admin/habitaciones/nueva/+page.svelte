<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { createRoom, getAdminRoomTypes, getAdminAmenities } from '$lib/services/room.service';
	import type { RoomTypeRead, AmenityRead } from '$lib/services/room.service';
	import RoomForm from '$lib/components/admin/RoomForm.svelte';
	import RoomTypesModal from '$lib/components/admin/RoomTypesModal.svelte';
	import '../../adminPage.css';

	let roomTypes = $state<RoomTypeRead[]>([]);
	let allAmenities = $state<AmenityRead[]>([]);
	let showRoomTypesModal = $state(false);
	let saving = $state(false);

	let room = $state({
		number: '',
		type: '',
		capacity: 1,
		base_price: 50.0,
		description: '',
		is_active: true,
		season_prices: [],
		images: [],
		amenities: []
	});

	async function loadTypes() {
		try {
			const [typesData, amenitiesData] = await Promise.all([
				getAdminRoomTypes(),
				getAdminAmenities()
			]);
			roomTypes = typesData;
			allAmenities = amenitiesData;
			if (roomTypes.length > 0 && !room.type) {
				room.type = roomTypes[0].name;
			}
		} catch (e: any) {
			toast.error('Error al cargar tipos: ' + e.message);
		}
	}

	onMount(() => {
		if (!hasPermission($authStore.user, 'rooms', 'create')) {
			goto('/admin/habitaciones');
			return;
		}
		loadTypes();
	});

	async function handleSave(e: Event) {
		e.preventDefault();
		saving = true;

		// Validation
		if (!room.number) {
			toast.warning("El número de habitación es obligatorio.");
			saving = false; return;
		}

		for (let s of room.season_prices) {
			if (!s.start_date || !s.end_date) {
				toast.warning("Complete las fechas de las temporadas.");
				saving = false; return;
			}
		}

		try {
			await createRoom(room);
			toast.success('Habitación creada exitosamente');
			goto('/admin/habitaciones');
		} catch (err: any) {
			toast.error(err.message || 'Error al guardar');
		} finally {
			saving = false;
		}
	}

	function handleCancel() {
		goto('/admin/habitaciones');
	}
</script>

<svelte:head>
	<title>Admin - Nueva Habitación</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4">
    <div class="mb-10">
        <nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
            <a href="/admin/habitaciones" class="hover:text-amber-600 transition-colors">Habitaciones</a>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="text-slate-900 dark:text-slate-200">Alta de Propiedad</span>
        </nav>
        
        <button class="group flex items-center gap-3 text-slate-500 hover:text-amber-600 transition-all" onclick={handleCancel}>
            <div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="text-xs font-black uppercase tracking-widest">Regresar</span>
        </button>
    </div>

    <RoomForm 
        mode="create"
        bind:room={room}
        {roomTypes}
        {allAmenities}
        {saving}
        onSave={handleSave}
        onCancel={handleCancel}
        onOpenRoomTypes={() => showRoomTypesModal = true}
    />
</div>

<RoomTypesModal 
	bind:show={showRoomTypesModal} 
	bind:roomTypes={roomTypes} 
/>
