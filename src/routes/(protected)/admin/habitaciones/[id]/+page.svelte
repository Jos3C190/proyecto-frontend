<script lang="ts">
	import { page as sveltePage } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { getRoom, updateRoom, getAdminRoomTypes } from '$lib/services/room.service';
	import type { RoomRead, RoomTypeRead } from '$lib/types/room';
	import RoomForm from '$lib/components/admin/RoomForm.svelte';
	import RoomTypesModal from '$lib/components/admin/RoomTypesModal.svelte';
	import '../../adminPage.css';

	let id = $derived(Number(sveltePage.params.id));
	let roomTypes = $state<RoomTypeRead[]>([]);
	let room = $state<any>(null);
	let loading = $state(true);
	let saving = $state(false);
	let showRoomTypesModal = $state(false);

	async function loadAll() {
		loading = true;
		try {
			const [roomData, typesData] = await Promise.all([
				getRoom(id),
				getAdminRoomTypes()
			]);
			roomTypes = typesData;
			// Adapt room for form
			room = {
				...roomData,
				season_prices: roomData.season_prices ? [...roomData.season_prices.map(s => ({...s}))] : [],
				images: roomData.images ? roomData.images.map(img => img.url) : []
			};
		} catch (e: any) {
			toast.error('Error al cargar datos: ' + e.message);
			goto('/admin/habitaciones');
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if (!hasPermission($authStore.user, 'rooms', 'update')) {
			goto('/admin/habitaciones');
			return;
		}
		loadAll();
	});

	async function handleSave(e: Event) {
		e.preventDefault();
		saving = true;

		try {
			await updateRoom(id, room);
			toast.success('Habitación actualizada con éxito');
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
	<title>Admin - Editar Habitación {room?.number || ''}</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4">
    <div class="mb-10">
        <nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
            <a href="/admin/habitaciones" class="hover:text-amber-600 transition-colors">Habitaciones</a>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="text-slate-900 dark:text-slate-200">Editor de Habitación</span>
            {#if room}
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="text-amber-600">#{room.number}</span>
            {/if}
        </nav>
        
        <button class="group flex items-center gap-3 text-slate-500 hover:text-amber-600 transition-all" onclick={handleCancel}>
            <div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/20 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <span class="text-xs font-black uppercase tracking-widest">Regresar</span>
        </button>
    </div>

	{#if loading}
		<div class="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
			<div class="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
			<p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando configuración...</p>
		</div>
	{:else if room}
		<RoomForm 
			mode="edit"
			bind:room={room}
			{roomTypes}
			{saving}
			onSave={handleSave}
			onCancel={handleCancel}
			onOpenRoomTypes={() => showRoomTypesModal = true}
		/>
	{/if}
</div>

<RoomTypesModal 
	bind:show={showRoomTypesModal} 
	bind:roomTypes={roomTypes} 
/>
