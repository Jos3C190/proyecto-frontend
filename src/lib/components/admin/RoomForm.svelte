<script lang="ts">
	import { 
		uploadRoomImage 
	} from '$lib/services/room.service';
	import type { RoomTypeRead } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';

	let { 
		mode = 'create', 
		room = $bindable(), 
		roomTypes, 
		onSave,
		onCancel,
		onOpenRoomTypes,
        saving = false
	} = $props<{
		mode: 'create' | 'edit';
		room: any;
		roomTypes: RoomTypeRead[];
		onSave: (e: Event) => Promise<void>;
		onCancel: () => void;
		onOpenRoomTypes: () => void;
        saving: boolean;
	}>();

	let uploadingImage = $state(false);
	let tempImageUrl = $state('');

	function addSeason() {
		room.season_prices = [...room.season_prices, { start_date: '', end_date: '', price_multiplier: 1.5, description: '' }];
	}
	
	function removeSeason(index: number) {
		room.season_prices.splice(index, 1);
		room.season_prices = [...room.season_prices];
	}

	async function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;
		
		const file = target.files[0];
		uploadingImage = true;
		try {
			const res = await uploadRoomImage(file);
			room.images = [...(room.images || []), res.url];
			toast.success('Imagen subida exitosamente');
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			uploadingImage = false;
			target.value = '';
		}
	}

	function addImageUrl() {
		if(tempImageUrl) {
			room.images = [...(room.images || []), tempImageUrl];
			tempImageUrl = '';
		}
	}

	function removeImage(index: number) {
		const removedUrl = room.images[index];
		room.images.splice(index, 1);
		room.images = [...room.images];
		
		// Si borramos la que era portada, limpiar el campo
		if (room.cover_image_url === removedUrl) {
			room.cover_image_url = room.images.length > 0 ? room.images[0] : '';
		}
	}

	function setAsCover(url: string) {
		room.cover_image_url = url;
		toast.success('Imagen de portada actualizada');
	}
</script>

<div class="room-form-v2-container pb-20">
    <!-- Header de Acción Persistente / Superior -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
            <h1 class="text-3xl font-black font-['Outfit'] text-slate-900 dark:text-white tracking-tight">
                {mode === 'create' ? 'Nueva Habitación' : `Editar Habitación ${room.number || ''}`}
            </h1>
            <p class="text-slate-500 font-medium text-sm mt-1">Configura los detalles técnicos, visuales y comerciales de tu inventario.</p>
        </div>
        <div class="flex items-center gap-3">
            <button type="button" class="admin-btn-secondary px-6" onclick={onCancel}>
                Descartar
            </button>
            <button type="submit" class="admin-btn px-8" onclick={onSave} disabled={saving}>
                {saving ? 'Procesando...' : (mode === 'create' ? 'Crear Habitación' : 'Guardar Cambios')}
            </button>
        </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- Columna Principal: Datos y Descripción (Izquierda - 7/12) -->
        <div class="lg:col-span-7 space-y-8">
            
            <!-- Card: Datos Principales -->
            <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-shadow duration-500">
                <div class="flex items-center gap-3 mb-8">
                    <div class="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Configuración General</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="admin-field group">
                        <label class="group-focus-within:text-amber-600 transition-colors">Número Identificador</label>
                        <input type="text" bind:value={room.number} placeholder="Ej. Suite 101" class="!rounded-2xl !bg-slate-50 dark:!bg-slate-950 !border-transparent focus:!border-amber-500/30 focus:!ring-amber-500/10 transition-all" required />
                    </div>
                    
                    <div class="admin-field group">
                        <label class="group-focus-within:text-amber-600 transition-colors">Categoría / Tipo</label>
                        <div class="flex gap-2">
                            <select bind:value={room.type} class="w-full !rounded-2xl !bg-slate-50 dark:!bg-slate-950 !border-transparent focus:!border-amber-500/30 transition-all">
                                {#if roomTypes.length === 0}
                                    <option value="" disabled>Sin tipos configurados</option>
                                {:else}
                                    {#each roomTypes as rt}
                                        <option value={rt.name}>{rt.name}</option>
                                    {/each}
                                {/if}
                            </select>
                            <button type="button" class="w-12 h-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-slate-500 dark:text-slate-400 hover:text-amber-600 transition-all" title="Gestionar Categorías" onclick={onOpenRoomTypes}>
                                <svg class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>
                            </button>
                        </div>
                    </div>

                    <div class="admin-field group">
                        <label class="group-focus-within:text-amber-600 transition-colors">Capacidad (Huéspedes)</label>
                        <div class="relative">
                            <input type="number" bind:value={room.capacity} class="!rounded-2xl !bg-slate-50 dark:!bg-slate-950 !border-transparent focus:!border-amber-500/30 transition-all pl-10" required min="1" />
                            
                        </div>
                    </div>

                    <div class="admin-field group">
                        <label class="group-focus-within:text-amber-600 transition-colors">Precio Base por Noche</label>
                        <div class="relative">
                            
                            <input type="number" step="0.01" bind:value={room.base_price} class="!rounded-2xl !bg-slate-50 dark:!bg-slate-950 !border-transparent focus:!border-amber-500/30 transition-all pl-10 font-mono font-bold text-lg" required min="1" />
                        </div>
                    </div>
                </div>

                <div class="admin-field mt-8">
                    <label>Descripción y Atractivos</label>
                    <textarea bind:value={room.description} rows="5" placeholder="Cuéntales a tus huéspedes qué hace única a esta habitación..." class="!rounded-[24px] !bg-slate-50 dark:!bg-slate-950 !border-transparent focus:!border-amber-500/30 transition-all p-5"></textarea>
                </div>

                <div class="mt-8 flex items-center justify-between p-5 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 dark:border-amber-500/20 rounded-[28px] transition-all">
                    <div class="flex items-center gap-4">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="active_v2" bind:checked={room.is_active} class="sr-only peer" />
                            <div class="w-12 h-6.5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#D4AF37] shadow-inner"></div>
                        </label>
                        <div>
                            <p class="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Visibilidad Pública</p>
                            <p class="text-[11px] text-slate-500 font-medium">Define si la propiedad es reservable en el catálogo.</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-black uppercase px-4 py-1.5 rounded-full transition-all {room.is_active ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 opacity-60'}">
                        {room.is_active ? 'Activa' : 'Desconectada'}
                    </span>
                </div>
            </section>

            <!-- Card: Temporadas -->
            <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </div>
                        <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Gestión de Tarifas</h2>
                    </div>
                    <button type="button" class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-xl transition-all" onclick={addSeason}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" stroke-width="3" stroke-linecap="round"/></svg>
                        Nueva Temporada
                    </button>
                </div>

                <div class="space-y-4">
                    {#if !room.season_prices?.length}
                        <div class="text-center py-16 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[32px] bg-slate-50/30 dark:bg-slate-950/20">
                            <div class="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" stroke-width="2"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" stroke-width="2" stroke-linecap="round"/></svg>
                            </div>
                            <p class="text-sm text-slate-400 font-bold uppercase tracking-widest">Sin Tarifas Dinámicas</p>
                            <p class="text-xs text-slate-500 mt-1 max-w-[250px] mx-auto">Se aplicará el Precio Base fijo durante todo el año si no creas temporadas.</p>
                        </div>
                    {:else}
                        <div class="grid grid-cols-1 gap-4">
                            {#each room.season_prices as sp, i}
                                <div class="relative group p-6 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-[28px] transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:border-emerald-500/20">
                                    <button type="button" class="absolute -top-3 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 z-20" onclick={() => removeSeason(i)}>
                                        <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                    </button>

                                    <div class="flex flex-col md:flex-row gap-6">
                                        <div class="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div class="admin-field">
                                                <label class="!text-[10px] !text-slate-400">Desde</label>
                                                <input type="date" class="!rounded-xl !bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !py-2 !text-xs" bind:value={sp.start_date} required/>
                                            </div>
                                            <div class="admin-field">
                                                <label class="!text-[10px] !text-slate-400">Hasta</label>
                                                <input type="date" class="!rounded-xl !bg-white dark:!bg-slate-800 !border-slate-200 dark:!border-slate-700 !py-2 !text-xs" bind:value={sp.end_date} required/>
                                            </div>
                                        </div>
                                        <div class="w-full md:w-[140px] px-6 border-l border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                                            <span class="text-[10px] font-black text-emerald-600 uppercase tracking-tighter block mb-1">Multiplicador</span>
                                            <div class="relative">
                                                <span class="absolute left-0 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">x</span>
                                                <input type="number" step="0.1" bind:value={sp.price_multiplier} class="w-full bg-transparent border-none p-0 pl-4 font-black text-2xl text-slate-800 dark:text-white outline-none focus:ring-0" required />
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <input type="text" class="w-full bg-transparent border-none p-0 text-sm italic text-slate-400 placeholder-slate-300 focus:ring-0 dark:text-slate-500" bind:value={sp.description} placeholder="Nota: Ejem. Temporada de Verano / Feriados" />
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </section>
        </div>

        <!-- Columna Lateral: Galería y Multimedia (Derecha - 5/12) -->
        <aside class="lg:col-span-5 space-y-8 lg:sticky lg:top-8">
            <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </div>
                        <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Multimedia</h2>
                    </div>
                </div>

                <div class="space-y-6">
                    <div class="relative group">
                        <label for="dropzone-v2" class="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer group-hover:border-indigo-500/30">
                            <div class="flex flex-col items-center justify-center pt-2 pb-3">
                                <div class="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 shadow-lg shadow-indigo-500/10">
                                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                </div>
                                <p class="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-1">Subir desde dispositivo</p>
                                <p class="text-[10px] text-slate-400 font-medium">PNG, JPG o WEBP (Max 10MB)</p>
                            </div>
                            <input id="dropzone-v2" type="file" class="hidden" accept="image/*" onchange={handleFileUpload} disabled={uploadingImage} />
                        </label>
                        {#if uploadingImage}
                            <div class="absolute inset-0 bg-white/90 dark:bg-slate-900/90 flex flex-col items-center justify-center rounded-[32px] backdrop-blur-sm z-10 transition-all">
                                <div class="w-12 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                                    <div class="bg-indigo-500 h-full w-1/2 animate-loading-bar"></div>
                                </div>
                                <span class="text-[9px] font-black uppercase text-indigo-600 tracking-widest animate-pulse">Sincronizando con Cloudinary...</span>
                            </div>
                        {/if}
                    </div>

                    <div class="relative">
                        <input type="url" placeholder="Añadir imagen por URL..." class="w-full bg-slate-50 dark:bg-slate-950 border-none rounded-2xl px-5 py-3.5 text-xs text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder-slate-400 transition-all pr-24 shadow-inner" bind:value={tempImageUrl} />
                        <button type="button" class="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30" onclick={addImageUrl} disabled={!tempImageUrl}>Pegar</button>
                    </div>

                    <div class="pt-4">
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
                            {#if room.images && room.images.length > 0}
                                {#each room.images as imgUrl, i}
                                    <div class="group relative aspect-square rounded-[20px] overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 transition-all hover:shadow-xl hover:scale-[1.02] {room.cover_image_url === imgUrl ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-slate-200 dark:border-slate-800'}">
                                        <img src={imgUrl} alt="Prop {i}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        
                                        <!-- Badge de Portada -->
                                        {#if room.cover_image_url === imgUrl}
                                            <div class="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg z-10 flex items-center gap-1">
                                                <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                                                Portada
                                            </div>
                                        {/if}

                                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                                            {#if room.cover_image_url !== imgUrl}
                                                <button type="button" class="bg-white/20 backdrop-blur-md text-white p-2 rounded-xl border border-white/30 hover:bg-amber-500 hover:border-amber-400 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300" title="Marcar como Portada" onclick={() => setAsCover(imgUrl)}>
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                </button>
                                            {/if}
                                            <button type="button" class="bg-red-500/90 backdrop-blur-md text-white p-2 rounded-xl border border-white/20 hover:bg-red-600 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300" title="Eliminar Imagen" onclick={() => removeImage(i)}>
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                {/each}
                            {:else}
                                <div class="col-span-full py-10 text-center bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-[32px]">
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Caja Vacía</p>
                                </div>
                            {/if}
                        </div>
                    </div>
                </div>
            </section>
        </aside>
    </div>
</div>

<style>
    @keyframes loading-bar {
        0% { transform: translateX(-150%); }
        100% { transform: translateX(150%); }
    }
    .animate-loading-bar {
        animation: loading-bar 1.5s infinite linear;
    }
    
    :global(.admin-wrapper) {
        background-color: #f8fafc;
    }
    :global(.dark .admin-wrapper) {
        background-color: #0B0E14;
    }
</style>
