<script lang="ts">
	import type { RoomRead } from '$lib/types/room';

	let { show = $bindable(), room, onOpenImage } = $props<{
		show: boolean;
		room: RoomRead | null;
		onOpenImage: (index: number) => void;
	}>();

	function close() {
		show = false;
	}
</script>

{#if show && room}
<div class="admin-modal-overlay flex items-center justify-center p-4" role="dialog" aria-modal="true" onclick={close} onkeydown={(e) => {if(e.key === 'Escape') close()}}>
	<div class="admin-modal !max-w-5xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} role="document" onkeydown={() => {}}>
		
		<div class="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
			<div>
				<h2 class="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
					Habitación #{room.number}
					<span class="text-sm font-normal px-2 py-1 rounded-full {room.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}">
						{room.is_active ? 'Activa' : 'Inactiva'}
					</span>
				</h2>
				<p class="text-sm text-slate-500 mt-1 uppercase tracking-wider font-semibold">{room.type}</p>
			</div>
			<div class="text-right">
				<p class="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Precio Base</p>
				<p class="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">${room.base_price}<span class="text-sm font-medium text-slate-400 h-full">/noche</span></p>
			</div>
		</div>

		<!-- Main Content Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
			
			<!-- Left Column -->
			<div class="space-y-6">
				<!-- Galería de Imágenes -->
				<div>
					<h3 class="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
						<span class="text-slate-400">📸</span> Fotografías ({room.images?.length || 0})
					</h3>
					{#if room.images && room.images.length > 0}
						<div class="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent;">
							{#each room.images as img, i}
								<button type="button" class="aspect-video bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 cursor-zoom-in" onclick={() => onOpenImage(i)}>
									<img src="{img.url}" alt="Foto habitación" class="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
								</button>
							{/each}
						</div>
					{:else}
						<div class="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center border border-dashed border-slate-200 dark:border-slate-700">
							<span class="text-4xl block mb-2 opacity-50">📷</span>
							<p class="text-slate-500 italic">No hay imágenes disponibles</p>
						</div>
					{/if}
				</div>
				
				<!-- Características -->
				<div class="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
					<h3 class="font-semibold text-indigo-900 dark:text-indigo-300 mb-3 flex items-center gap-2">
						<span class="text-indigo-500">✨</span> Descripción y Amenidades
					</h3>
					<div class="mb-4">
						<p class="text-slate-700 dark:text-slate-300 leading-relaxed text-justify">
							{room.description || 'Sin descripción especial detallada para esta habitación.'}
						</p>
					</div>
					
					<div>
						<p class="text-xs uppercase tracking-wider text-indigo-800/70 font-bold mb-2">Características</p>
						<div class="flex flex-wrap gap-2">
							<span class="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm flex items-center gap-1">
								👥 Capacidad: {room.capacity} pax
							</span>
							{#if room.amenities && room.amenities.length > 0}
								{#each room.amenities as am}
									<span class="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
										• {am.name}
									</span>
								{/each}
							{/if}
						</div>
					</div>
				</div>
			</div>

			<!-- Right Column -->
			<div class="space-y-6">
				<!-- Tarifas Dinámicas -->
				<div class="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-lg border border-emerald-100 dark:border-emerald-900/50 h-full shadow-sm">
					<h3 class="font-semibold text-emerald-900 dark:text-emerald-400 mb-3 flex items-center gap-2">
						<span class="text-emerald-500">📈</span> Precios por Temporada ({room.season_prices?.length || 0})
					</h3>
					
					{#if room.season_prices && room.season_prices.length > 0}
						<div class="space-y-3 max-h-[400px] overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #059669 transparent;">
							{#each room.season_prices as season}
								<div class="p-3 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 rounded flex flex-col gap-2">
									<div class="flex justify-between items-start">
										<p class="font-medium text-emerald-800 dark:text-emerald-300">{season.description || 'Temporada Dinámica'}</p>
										<span class="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded">
											x{season.price_multiplier}
										</span>
									</div>
									<div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
										<span>Desde: {season.start_date}</span>
										<span>Hasta: {season.end_date}</span>
									</div>
									<div class="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
										<span class="text-[11px] text-slate-400 uppercase tracking-widest">Costo por Noche</span>
										<strong class="text-emerald-700 dark:text-emerald-400">
											${(room.base_price * season.price_multiplier).toFixed(2)}
										</strong>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-6 text-center text-slate-500 italic mt-4 bg-white/50 dark:bg-slate-900/50 rounded">
							Esta habitación no cuenta con precios dinámicos por temporada en el sistema. Siempre costará la Tarifa Base anunciada.
						</div>
					{/if}
				</div>
			</div>
			
		</div>

		<div class="admin-modal-actions mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 justify-end flex">
			<button type="button" class="admin-btn-secondary px-6" onclick={close}>Cerrar</button>
		</div>
	</div>
</div>
{/if}
