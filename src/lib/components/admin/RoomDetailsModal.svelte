<script lang="ts">
	import type { RoomRead, SeasonPriceRead, RoomPriceHistoryResponse } from '$lib/types/room';
	import { getRoomPriceHistory } from '$lib/services/room.service';

	let { show = $bindable(), room, onOpenImage } = $props<{
		show: boolean;
		room: RoomRead | null;
		onOpenImage: (index: number) => void;
	}>();

	let showHistory = $state(false);
	let priceHistory: RoomPriceHistoryResponse | null = $state(null);
	let loadingHistory = $state(false);

	let targetDate = $state('');

	let computedDailyPrice = $derived.by(() => {
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
		
		const activeBp = activeBasePrices.length > 0 ? Number(activeBasePrices[0].base_price) : Number(room.base_price);

		if (activeSp) {
			return (activeBp * Number(activeSp.price_multiplier)).toFixed(2);
		}

		return activeBp.toFixed(2);
	});

	$effect(() => {
	    // reset state when room changes
	    if (show && room) {
	        showHistory = false;
	        priceHistory = null;
			targetDate = '';
	    }
	});

	async function toggleHistory() {
		if (!room) return;
		showHistory = !showHistory;
		if (showHistory && !priceHistory) {
			loadingHistory = true;
			try {
				priceHistory = await getRoomPriceHistory(room.id);
			} catch (e) {
				console.error(e);
			} finally {
				loadingHistory = false;
			}
		}
	}

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

					<div class="mt-4 border-t border-emerald-200 dark:border-emerald-800/60 pt-3">
						<button type="button" class="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider w-full text-center flex justify-center items-center gap-1 transition-colors" onclick={toggleHistory}>
							{showHistory ? 'Ocultar Historial' : 'Ver Historial de Auditoría (Precios Anteriores)'}
						</button>
						
						{#if showHistory}
							<div class="mt-3 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-2 rounded border border-slate-200 dark:border-slate-700">
                                <div class="flex items-center gap-2">
                                    <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">¿Precio al día:</span>
                                    <input type="date" bind:value={targetDate} class="text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1 focus:ring-1 focus:outline-none focus:ring-emerald-500" />
                                    <span class="text-[11px] font-semibold text-slate-500">?</span>
                                </div>
                                
                                {#if computedDailyPrice !== null}
                                    <div class="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 mt-0 rounded-full shrink-0">
                                        <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider hidden sm:inline">Costo:</span>
                                        <span class="text-xs font-black text-emerald-800 dark:text-emerald-300">${computedDailyPrice}</span>
                                    </div>
                                {/if}
                            </div>

							<div class="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-2" style="scrollbar-width: thin;">
								{#if loadingHistory}
									<p class="text-center text-xs text-slate-500 py-2">Cargando bitácora de precios...</p>
								{:else if !priceHistory || (priceHistory.season_prices.length === 0 && priceHistory.base_prices.length === 0)}
									<p class="text-center text-xs text-slate-500 py-2">No hay registros históricos almacenados.</p>
								{:else}
									{@const combinedHistory = [
										...(priceHistory.season_prices || []).map(sp => ({ type: 'season', date: new Date(sp.created_at || 0), data: sp })),
										...(priceHistory.base_prices || []).map(bp => ({ type: 'base', date: new Date(bp.created_at || 0), data: bp }))
									].sort((a, b) => b.date.getTime() - a.date.getTime())}

									{@const filteredHistory = targetDate 
										? combinedHistory.filter(i => {
											if (i.type === 'season') {
												const sp = i.data as SeasonPriceRead;
												return sp.start_date <= targetDate && sp.end_date >= targetDate;
											} else {
												return i.date <= new Date(targetDate + 'T23:59:59');
											}
										}) 
										: combinedHistory}

									{#if filteredHistory.length === 0}
										<p class="text-center text-xs text-slate-500 py-2">No hay registros para esta fecha.</p>
									{/if}

									{#each filteredHistory as item}
										{#if item.type === 'season'}
											{@const ph = item.data as SeasonPriceRead}
											<div class="p-2.5 bg-slate-50 dark:bg-slate-800/50 border {ph.is_archived ? 'border-slate-300 dark:border-slate-700' : 'border-emerald-300 dark:border-emerald-700'} rounded shadow-sm">
												<div class="flex justify-between items-center mb-1">
													<span class="text-[11px] font-bold uppercase {ph.is_archived ? 'text-slate-500' : 'text-emerald-600'}">
														{ph.is_archived ? 'Archivado' : 'Activo'}
													</span>
													<span class="text-[10px] text-slate-400 font-mono" title="Fecha de Creación">
														Creado: {ph.created_at ? new Date(ph.created_at).toLocaleDateString() : 'Desconocido'}
													</span>
												</div>
												<div class="flex justify-between items-start">
													<p class="text-xs font-medium text-slate-700 dark:text-slate-300">{ph.description || 'Temporada'}</p>
													<span class="text-xs font-mono text-slate-500">Mult: x{ph.price_multiplier}</span>
												</div>
												<div class="flex justify-between text-[10px] text-slate-500 my-1">
													<span>{ph.start_date} al {ph.end_date}</span>
												</div>
												<div class="pt-1 mt-1 border-t border-slate-200 dark:border-slate-700 flex justify-between items-end">
													<span class="text-[10px] text-slate-400">Precio Base Creado: ${ph.snapshot_base_price !== null ? ph.snapshot_base_price : room.base_price}</span>
													<strong class="text-sm {ph.is_archived ? 'text-slate-600 dark:text-slate-400' : 'text-emerald-700 dark:text-emerald-400'}">
														${( (ph.snapshot_base_price !== null ? ph.snapshot_base_price : room.base_price) * ph.price_multiplier ).toFixed(2)}
													</strong>
												</div>
											</div>
										{:else}
											{@const bp = item.data as any}
											<div class="p-2.5 bg-blue-50/50 dark:bg-indigo-900/20 border border-blue-200 dark:border-indigo-800/60 rounded shadow-sm">
												<div class="flex justify-between items-center mb-1">
													<span class="text-[11px] font-bold uppercase text-blue-600 dark:text-indigo-400">
														Ajuste Precio Base
													</span>
													<span class="text-[10px] text-slate-400 font-mono" title="Fecha de Creación">
														Creado: {bp.created_at ? new Date(bp.created_at).toLocaleDateString() : 'Desconocido'}
													</span>
												</div>
												<div class="flex justify-between items-center">
													<span class="text-[10px] text-slate-500">Nuevo Precio Pleno Mínimo</span>
													<strong class="text-sm text-blue-700 dark:text-indigo-300">
														${Number(bp.base_price).toFixed(2)}
													</strong>
												</div>
											</div>
										{/if}
									{/each}
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
			
		</div>

		<div class="admin-modal-actions mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 justify-end flex">
			<button type="button" class="admin-btn-secondary px-6" onclick={close}>Cerrar</button>
		</div>
	</div>
</div>
{/if}
