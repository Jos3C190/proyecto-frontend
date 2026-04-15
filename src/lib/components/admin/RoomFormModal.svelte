<script lang="ts">
	import { 
		createRoom, 
		updateRoom, 
		uploadRoomImage 
	} from '$lib/services/room.service';
	import type { RoomRead, RoomTypeRead } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';

	let { 
		show = $bindable(), 
		mode = 'create', 
		room, 
		roomTypes, 
		onSuccess,
		onOpenRoomTypes
	} = $props<{
		show: boolean;
		mode: 'create' | 'edit';
		room: any;
		roomTypes: RoomTypeRead[];
		onSuccess: () => Promise<void>;
		onOpenRoomTypes: () => void;
	}>();

	let saving = $state(false);
	let uploadingImage = $state(false);
	let tempImageUrl = $state('');

	async function handleSave(e: Event) {
		e.preventDefault();
		saving = true;
		
		// Validar fechas
		for (let s of room.season_prices) {
			if (!s.start_date || !s.end_date) {
				toast.warning("Complete las fechas de las temporadas.");
				saving = false; return;
			}
		}
		try {
			if (mode === 'create') {
				await createRoom(room);
				toast.success('Habitación creada con éxito');
			} else {
				await updateRoom(room.id, room);
				toast.success('Cambios guardados');
			}
			show = false;
			await onSuccess();
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			saving = false;
		}
	}

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
		room.images.splice(index, 1);
		room.images = [...room.images];
	}

	function close() {
		show = false;
	}
</script>

{#if show}
	<div class="admin-modal-overlay">
		<div class="admin-modal !max-w-6xl w-full max-h-[90vh] overflow-y-auto">
			<h2 class="admin-modal-title">{mode === 'create' ? 'Nueva Habitación' : 'Editar Habitación'}</h2>
			<form onsubmit={handleSave} class="flex flex-col h-full">

				<div class="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 flex-1 pr-1 lg:pr-2">
					<!-- Columna Izquierda: Información Principal -->
					<div class="flex flex-col gap-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
					<div class="admin-field">
						<label>Número de Habitación</label>
						<input type="text" bind:value={room.number} placeholder="Ej. 101" required />
					</div>
					<div class="admin-field">
						<label>Tipo de Habitación</label>
						<div class="flex gap-2">
							<select bind:value={room.type} class="w-full">
								{#if roomTypes.length === 0}
									<option value="" disabled>No hay tipos</option>
								{:else}
									{#each roomTypes as rt}
										<option value={rt.name}>{rt.name}</option>
									{/each}
								{/if}
							</select>
							<button type="button" class="admin-btn-secondary px-3" title="Administrar Tipos" onclick={onOpenRoomTypes}>⚙️</button>
						</div>
					</div>
					<div class="admin-field">
						<label>Capacidad Máxima</label>
						<input type="number" bind:value={room.capacity} required min="1" />
					</div>
					<div class="admin-field">
						<label>Precio Base (Por Noche)</label>
						<div class="relative">
							<span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
							<input type="number" step="0.01" bind:value={room.base_price} class="pl-7" required min="1" />
						</div>
					</div>
						</div>

						<div class="admin-field mt-1">
					<label>Descripción General</label>
					<textarea bind:value={room.description} rows="2" placeholder="Detalles sobre la habitación..."></textarea>
				</div>

						<div class="flex items-center gap-3 py-2 mt-2 bg-amber-50/50 dark:bg-amber-900/10 p-4 border border-amber-100 dark:border-amber-900/30 rounded-xl">
							<div class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" id="room_active" bind:checked={room.is_active} class="sr-only peer" />
								<div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
								<label for="room_active" class="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">Habitación Disponible para Reserva</label>
							</div>
						</div>
					</div>

					<!-- Columna Derecha: Fotos y Temporadas -->
					<div class="flex flex-col gap-6">
						<div class="bg-white dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
					<div class="flex items-center justify-between mb-4">
						<h4 class="font-['Outfit'] font-semibold text-slate-800 dark:text-slate-200">Fotografías de la Habitación</h4>
					</div>
					
					<div class="space-y-4">
						<div class="flex gap-2">
							<input type="url" placeholder="Añadir por URL externa (ej. https://...)" class="flex-1 w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm focus:border-[#D4AF37] dark:border-slate-600 dark:bg-slate-800/50 dark:text-white" bind:value={tempImageUrl} />
							<button type="button" class="admin-btn-secondary px-4 h-full" onclick={addImageUrl} disabled={!tempImageUrl}>+ Añadir URL</button>
						</div>

                        <div class="relative flex items-center justify-center w-full">
                            <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-700">
                                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg class="w-8 h-8 mb-4 text-slate-500 dark:text-slate-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                    </svg>
                                    <p class="mb-2 text-sm text-slate-500 dark:text-slate-400"><span class="font-semibold">Haz clic para subir un archivo local desde tu dispositivo</span></p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, WEBP (Se subirá y alojará en la nube Enterprise)</p>
                                </div>
                                <input id="dropzone-file" type="file" class="hidden" accept="image/*" onchange={handleFileUpload} disabled={uploadingImage} />
                            </label>
                            {#if uploadingImage}
                                <div class="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
                                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
                                    <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Enviando a Cloudinary...</span>
                                </div>
                            {/if}
                        </div>

                        {#if room.images && room.images.length > 0}
                            <div class="grid grid-cols-4 gap-3 mt-4 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg max-h-[250px] overflow-y-auto" style="scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
                                {#each room.images as imgUrl, i}
                                    <div class="relative group aspect-square bg-slate-200 dark:bg-slate-900 rounded-md overflow-hidden border border-slate-300 dark:border-slate-600 shadow-sm">
                                        <img src={imgUrl} alt="Vista previa de habitación {i}" class="w-full h-full object-cover" />
                                        <button type="button" class="absolute top-1 right-1 bg-red-500/90 text-white rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" onclick={() => removeImage(i)} title="Quitar imagen">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="text-sm text-slate-500 dark:text-slate-400">No hay imágenes configuradas para esta habitación.</p>
                        {/if}
					</div>
						</div>
				
						<div class="bg-white dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-auto">
					<div class="flex items-center justify-between mb-4">
						<h4 class="font-['Outfit'] font-semibold text-slate-800 dark:text-slate-200">Precios por Temporada</h4>
						<button type="button" class="admin-btn-secondary" onclick={addSeason}>+ Temporada</button>
					</div>
					{#if room.season_prices && room.season_prices.length > 0}
						<div class="space-y-4 max-h-[350px] overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
							{#each room.season_prices as sp, i}
								<div class="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/80 rounded-xl relative group transition-colors hover:border-[#D4AF37]/40 dark:hover:border-[#D4AF37]/40">
									<!-- Botón Eliminar Flotante -->
									<button type="button" class="absolute -top-3 -right-3 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 rounded-full w-8 h-8 flex items-center justify-center transition-all shadow-sm opacity-0 group-hover:opacity-100 cursor-pointer pointer-events-none group-hover:pointer-events-auto dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white" onclick={() => removeSeason(i)} title="Eliminar Temporada">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
									</button>
									
									<div class="grid grid-cols-2 gap-3 mb-3">
										<div>
											<label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
											<input type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#D4AF37] dark:border-slate-600 dark:bg-slate-800 dark:text-white" bind:value={sp.start_date} required/>
										</div>
										<div>
											<label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
											<input type="date" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#D4AF37] dark:border-slate-600 dark:bg-slate-800 dark:text-white" bind:value={sp.end_date} required/>
										</div>
									</div>
									<div class="flex gap-3">
										<div class="w-1/3">
											<label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Multiplicador</label>
											<input type="number" step="0.1" min="0.1" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#D4AF37] dark:border-slate-600 dark:bg-slate-800 dark:text-white" bind:value={sp.price_multiplier} title="Multiplicador del precio base" required/>
										</div>
										<div class="w-2/3">
											<label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nota / Razón</label>
											<input type="text" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#D4AF37] dark:border-slate-600 dark:bg-slate-800 dark:text-white" bind:value={sp.description} placeholder="Ej. Año Nuevo" />
										</div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-sm text-slate-500 dark:text-slate-400">No hay variaciones de precio configuradas.</p>
					{/if}
						</div>
					</div>
				</div>

				<div class="admin-modal-actions mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
					<button type="button" class="admin-btn-secondary" onclick={close}>Cancelar</button>
					<button type="submit" class="admin-btn" disabled={saving}>
						{saving ? 'Guardando...' : 'Guardar Datos'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
