<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getRoom } from '$lib/services/room.service';
	import type { RoomRead } from '$lib/types/room';
	import { createReservation } from '$lib/services/reservation.service';
	import { onMount } from 'svelte';

	let roomId = Number($page.params.room_id);
	let checkIn = $state($page.url.searchParams.get('checkIn') || '');
	let checkOut = $state($page.url.searchParams.get('checkOut') || '');
	let guests = $state(Number($page.url.searchParams.get('guests')) || 1);

	let room = $state<RoomRead | null>(null);
	let loading = $state(true);
	let submitLoading = $state(false);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			room = await getRoom(roomId);
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
			// Redirigir directamente al pago (Paso 2)
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
						Detalles de la Habitación
					</h3>
					
					<div class="relative z-10 mb-6">
						<h4 class="text-2xl font-light font-['Outfit'] text-slate-800 dark:text-white mb-1">{room.type} Suite</h4>
						<p class="text-sm text-slate-500 dark:text-slate-400">Habitación No. {room.number}</p>
					</div>
					
					<div class="space-y-4 relative z-10">
						<div class="flex justify-between items-center bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
							<span class="text-sm text-slate-500 dark:text-slate-400 font-medium">Capacidad Máxima</span>
							<span class="text-slate-800 dark:text-slate-200 font-bold">{room.capacity} Personas</span>
						</div>
						
						<div class="flex justify-between items-center bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
							<span class="text-sm text-slate-500 dark:text-slate-400 font-medium">Tarifa por Noche</span>
							<span class="text-xl font-['Outfit'] text-[#D4AF37] font-semibold">${room.base_price}</span>
						</div>
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
								<input type="date" id="check_in" bind:value={checkIn} required
									class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50" />
							</div>
							
							<div class="space-y-2">
								<label for="check_out" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Check-Out</label>
								<input type="date" id="check_out" bind:value={checkOut} required
									class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50" />
							</div>
						</div>

						<div class="space-y-2">
							<label for="guests" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Número de Personas</label>
							<input type="number" id="guests" min="1" max={room.capacity} bind:value={guests} required
								class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50" />
							<p class="text-xs text-slate-400 mt-1">Máximo permitido: {room.capacity} huéspedes.</p>
						</div>

						<div class="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end gap-4">
							<a href="/rooms" class="px-6 py-3 rounded-xl border border-slate-300 bg-transparent text-sm font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white text-center">
								Cancelar
							</a>
							<button type="submit" disabled={submitLoading} class="px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA8222] text-sm font-bold uppercase tracking-widest text-slate-900 transition-all hover:from-[#f3cd54] hover:to-[#c69a2b] shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed">
								{#if submitLoading}
									<span class="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mr-2 align-middle"></span>
									Procesando
								{:else}
									Confirmar Fechas &rarr;
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
