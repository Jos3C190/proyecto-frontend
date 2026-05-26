<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getRoom } from '$lib/services/room.service';
	import type { RoomRead } from '$lib/types/room';
	import { createReservation, addClientReservationExtra } from '$lib/services/reservation.service';
	import { fetchPublicExtraAmenities, type ExtraAmenityRead } from '$lib/services/extra_amenity.service';
	import { onMount } from 'svelte';
	import { fetchPublicSettings } from '$lib/services/settings.service';

	import { createPersistence } from '$lib/utils/persistence';

	const persistence = createPersistence({
		key: 'public_rooms',
		defaultValues: {
			checkIn: $page.url.searchParams.get('checkIn') || '',
			checkOut: $page.url.searchParams.get('checkOut') || '',
			guests: Number($page.url.searchParams.get('guests')) || 2
		}
	});

	const initialState = persistence.getInitialState();

	let roomId = Number($page.params.room_id);
	let checkIn = $state(initialState.checkIn);
	let checkOut = $state(initialState.checkOut);
	let guests = $state(Number(initialState.guests));

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			checkIn,
			checkOut,
			guests: guests.toString()
		});
	});

	let room = $state<RoomRead | null>(null);
	let availableExtras = $state<ExtraAmenityRead[]>([]);
	let selectedExtras = $state<Record<number, number>>({});
	
	let loading = $state(true);
	let submitLoading = $state(false);
	let error = $state<string | null>(null);

	const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
	let minCheckOut = $derived(checkIn ? (() => {
		const d = new Date(checkIn);
		d.setDate(d.getDate() + 1);
		return d.toISOString().split('T')[0];
	})() : today);

	$effect(() => {
		if (checkIn && checkOut && checkOut <= checkIn) {
			checkOut = minCheckOut;
		}
	});

	// Calculation for Price Breakdown applying Season Multipliers
	let numNights = $derived.by(() => {
		if (!checkIn || !checkOut) return 0;
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		const diff = end.getTime() - start.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	});

	let subtotal = $derived.by(() => {
		if (!room || !checkIn || !checkOut) return 0;
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		let current = new Date(start);
		let totalSubtotal = 0;

		while (current < end) {
			let multiplier = 1.0;
			const currentStr = current.toISOString().split('T')[0];
			
			if (room.season_prices) {
				for (const sp of room.season_prices) {
					if (!sp.is_archived && currentStr >= sp.start_date && currentStr <= sp.end_date) {
						multiplier = Number(sp.price_multiplier);
						break;
					}
				}
			}
			
			totalSubtotal += Number(room.base_price) * multiplier;
			current.setDate(current.getDate() + 1);
		}
		return totalSubtotal;
	});

	let ivaRate = $state(0.13);
	let tourismRate = $state(0.05);

	let iva = $derived(subtotal * ivaRate);
	let tourism = $derived(subtotal * tourismRate);
	let roomTotal = $derived(subtotal + iva + tourism);
	
	let extrasTotal = $derived(
		availableExtras.reduce((sum, extra) => sum + (extra.price * (selectedExtras[extra.id] || 0)), 0)
	);
	let extrasIva = $derived(extrasTotal * ivaRate);
	
	let total = $derived(roomTotal + extrasTotal + extrasIva);

	onMount(async () => {
		try {
			room = await getRoom(roomId);
			availableExtras = await fetchPublicExtraAmenities();
			try {
				const settings = await fetchPublicSettings();
				ivaRate = settings.tax_iva_rate;
				tourismRate = settings.tax_tourism_rate;
			} catch (settingsErr) {
				console.error("Error fetching public settings, using defaults:", settingsErr);
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		submitLoading = true;

		try {
			const res = await createReservation({
				room_id: roomId,
				check_in: checkIn,
				check_out: checkOut,
				guests: guests
			});
			
			// Process extras
			for (const extraId in selectedExtras) {
				const qty = selectedExtras[extraId];
				if (qty > 0) {
					await addClientReservationExtra(res.id, Number(extraId), qty);
				}
			}

			// Redirigir directamente al pago (Paso 2)
			persistence.clearState();
			goto(`/payments/${res.id}`);
		} catch (err: any) {
			error = err.message;
			submitLoading = false;
		}
	}
</script>

<div class="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 fade-in flex justify-center items-start">
	<div class="w-full max-w-5xl">
		{#if loading}
			<div class="flex flex-col items-center justify-center py-20">
				<div class="h-12 w-12 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent mb-4"></div>
				<p class="text-slate-500 font-['Outfit'] tracking-widest uppercase text-sm dark:text-[#D4AF37]">Preparando su reserva...</p>
			</div>
		{:else if room}
			<div class="mb-10 text-center">
				<h2 class="font-['Outfit'] text-4xl font-light tracking-wide text-slate-800 dark:text-white mb-2">
					Completar <span class="text-[#D4AF37] font-semibold">Reservación</span>
				</h2>
				<p class="text-slate-500 dark:text-slate-400 font-medium tracking-wide">A unos pasos de su experiencia de lujo.</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
				
				<!-- Detalles de la Habitación (Izquierda) -->
				<div class="lg:col-span-2 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-slate-50 to-white backdrop-blur-xl p-8 shadow-xl dark:from-slate-800/80 dark:to-slate-900/80 relative overflow-hidden">
					<div class="absolute -top-10 -right-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl"></div>
					<h3 class="font-['Outfit'] text-sm tracking-widest uppercase font-semibold text-slate-500 dark:text-[#D4AF37] mb-6 relative z-10 border-b border-slate-200/50 dark:border-slate-700/50 pb-4">
						Resumen de Estancia
					</h3>
					
					<div class="relative z-10 mb-6">
						<h4 class="text-2xl font-light font-['Outfit'] text-slate-800 dark:text-white mb-1">{room.type} Suite</h4>
						<p class="text-sm text-slate-500 dark:text-slate-400">Habitación No. {room.number}</p>
					</div>
					
					<div class="space-y-4 relative z-10">
						<div class="flex justify-between items-center bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
							<span class="text-sm text-slate-500 dark:text-slate-400 font-medium">Noches</span>
							<span class="text-slate-800 dark:text-slate-200 font-bold">{numNights}</span>
						</div>
						
						<div class="p-4 rounded-xl border border-dashed border-[#D4AF37]/30 bg-[#D4AF37]/5 space-y-3">
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-500 dark:text-slate-400">Subtotal {numNights > 0 ? `(${numNights} n.)` : ''}</span>
								<span class="text-slate-800 dark:text-slate-200 font-semibold">${subtotal.toFixed(2)}</span>
							</div>
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-500 dark:text-slate-400">IVA ({(ivaRate * 100).toFixed(0)}%)</span>
								<span class="text-slate-800 dark:text-slate-200 font-semibold">${iva.toFixed(2)}</span>
							</div>
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-500 dark:text-slate-400">Turismo ({(tourismRate * 100).toFixed(0)}%)</span>
								<span class="text-slate-800 dark:text-slate-200 font-semibold">${tourism.toFixed(2)}</span>
							</div>
							<div class="pt-2 border-t border-[#D4AF37]/20 flex justify-between items-center">
								<span class="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Subtotal Habitación</span>
								<span class="text-base font-['Outfit'] text-[#D4AF37] font-bold">${roomTotal.toFixed(2)}</span>
							</div>
							{#if extrasTotal > 0}
								<div class="flex justify-between items-center text-sm pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
									<span class="text-slate-500 dark:text-slate-400">Servicios Extras</span>
									<span class="text-slate-800 dark:text-slate-200">${extrasTotal.toFixed(2)}</span>
								</div>
								<div class="flex justify-between items-center text-sm pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
									<span class="text-slate-500 dark:text-slate-400">IVA Servicios Extras ({(ivaRate * 100).toFixed(0)}%)</span>
									<span class="text-slate-800 dark:text-slate-200">${extrasIva.toFixed(2)}</span>
								</div>
							{/if}
							<div class="pt-2 border-t border-[#D4AF37]/20 flex justify-between items-center">
								<span class="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wider">Total</span>
								<span class="text-2xl font-['Outfit'] text-[#D4AF37] font-bold">${total.toFixed(2)}</span>
							</div>
						</div>

						{#if numNights > 0}
							<p class="text-[10px] text-center text-slate-400 uppercase tracking-widest mt-4">
								* Tarifas dinámicas aplicadas según temporada
							</p>
						{/if}
					</div>
				</div>

				<!-- Formulario (Derecha) -->
				<div class="lg:col-span-3 rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-8 shadow-xl dark:border-slate-800/50 dark:bg-slate-900/60">
					{#if error}
						<div class="mb-6 rounded-xl border border-red-200 bg-red-50/80 backdrop-blur-sm p-4 text-center shadow-sm dark:border-red-900/30 dark:bg-red-500/10">
							<p class="text-red-600 font-medium dark:text-red-400 text-sm">{error}</p>
						</div>
					{/if}

					<form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="space-y-2">
								<label for="check_in" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Check-In</label>
								<input type="date" id="check_in" bind:value={checkIn} min={today} required
									class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50" />
							</div>
							
							<div class="space-y-2">
								<label for="check_out" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Check-Out</label>
								<input type="date" id="check_out" bind:value={checkOut} min={minCheckOut} required
									class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50" />
							</div>
						</div>

						<div class="space-y-2">
							<label for="guests" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Número de Personas</label>
							<input type="number" id="guests" min="1" max={room.capacity} bind:value={guests} required
								class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50" />
							<p class="text-xs text-slate-400 mt-1">Máximo permitido: {room.capacity} huéspedes.</p>
						</div>

						{#if availableExtras.length > 0}
							<div class="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 space-y-4">
								<div class="mb-4">
									<h4 class="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">Servicios Adicionales (Opcional)</h4>
									<p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Mejora tu estancia con estos servicios exclusivos.</p>
								</div>
								
								<div class="grid grid-cols-1 gap-4">
									{#each availableExtras as extra}
										<div class="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-[#D4AF37]/50 transition-all">
											<div class="flex items-center gap-4">
												<div class="w-12 h-12 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-xl shadow-sm overflow-hidden shrink-0">
													{#if extra.image_url}
														<img src={extra.image_url} alt={extra.name} class="w-full h-full object-cover" />
													{:else}
														<span>{extra.icon || '⭐'}</span>
													{/if}
												</div>
												<div>
													<p class="text-sm font-bold text-slate-800 dark:text-slate-200">{extra.name}</p>
													<p class="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">${extra.price}</p>
												</div>
											</div>
											<div class="flex items-center gap-3">
												<button 
													type="button" 
													class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-30"
													onclick={() => {
														if ((selectedExtras[extra.id] || 0) > 0) {
															selectedExtras[extra.id]--;
														}
													}}
													disabled={!(selectedExtras[extra.id] > 0)}
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
												</button>
												<span class="w-4 text-center text-sm font-bold text-slate-800 dark:text-white">{selectedExtras[extra.id] || 0}</span>
												<button 
													type="button" 
													class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
													onclick={() => {
														selectedExtras[extra.id] = (selectedExtras[extra.id] || 0) + 1;
													}}
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
												</button>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<div class="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end gap-4">
							<a href="/rooms/{roomId}" class="px-6 py-3 rounded-xl border border-slate-300 bg-transparent text-sm font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white text-center">
								Volver
							</a>
							<button type="submit" disabled={submitLoading || numNights <= 0} class="px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA8222] text-sm font-bold uppercase tracking-widest text-slate-900 transition-all hover:from-[#f3cd54] hover:to-[#c69a2b] shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed">
								{#if submitLoading}
									<span class="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>
									Procesando
{:else}
									Confirmar Reservación &rarr;
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.fade-in {
		animation: fadeIn 0.5s ease-out forwards;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(15px); }
		to { opacity: 1; transform: translateY(0); }
	}
	
	/* Invertir el color del icono del calendario en modo oscuro */
	:global(html.dark) input[type="date"]::-webkit-calendar-picker-indicator {
		filter: invert(1) opacity(0.7);
		cursor: pointer;
	}
</style>
