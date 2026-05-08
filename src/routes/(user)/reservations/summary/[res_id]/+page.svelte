<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getReservation, cancelReservation, cancelPayment } from '$lib/services/reservation.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import { onMount, onDestroy } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import CancellationModal from '$lib/components/ui/CancellationModal.svelte';
	import PaymentCancelModal from '$lib/components/ui/PaymentCancelModal.svelte';

	let resId = Number($page.params.res_id);
	let reservation = $state<ReservationRead | null>(null);
	let loading = $state(true);
	let cancelLoading = $state(false);
	let isCancelModalOpen = $state(false);
	let isPaymentModalOpen = $state(false);
	let selectedPaymentId = $state<number | null>(null);
	let error = $state<string | null>(null);
	let timeLeft = $state<string | null>(null);
	let timer: ReturnType<typeof setInterval>;

	function updateTimer() {
		if (!reservation || reservation.status !== 'pending') {
			timeLeft = null;
			if (timer) clearInterval(timer);
			return;
		}
		
		// Calcular expiración a 24 horas de la última actualización (ej. desde que el admin la rechazó)
		const updatedAt = new Date(reservation.updated_at).getTime();
		const expiresAt = updatedAt + (24 * 60 * 60 * 1000);
		const now = new Date().getTime();
		const diff = expiresAt - now;

		if (diff <= 0) {
			timeLeft = "Expirado";
			if (timer) clearInterval(timer);
			// Recargar para ver si el backend ya la canceló
			setTimeout(() => loadReservation(), 2000);
		} else {
			const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
			const seconds = Math.floor((diff % (1000 * 60)) / 1000);
			
			timeLeft = `${hours}h ${minutes}m ${seconds}s`;
		}
	}

	async function loadReservation() {
		try {
			reservation = await getReservation(resId);
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
			if (reservation?.status === 'pending') {
				updateTimer();
				if (!timer) timer = setInterval(updateTimer, 1000);
			}
		}
	}

	onMount(() => {
		loadReservation();
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	async function confirmCancellation() {
		cancelLoading = true;
		try {
			await cancelReservation(resId);
			isCancelModalOpen = false;
			await loadReservation();
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			cancelLoading = false;
		}
	}

	async function handleCancel() {
		isCancelModalOpen = true;
	}

	async function handleCancelPayment(paymentId: number) {
		selectedPaymentId = paymentId;
		isPaymentModalOpen = true;
	}

	async function confirmPaymentCancellation() {
		if (selectedPaymentId === null) return;
		cancelLoading = true;
		try {
			await cancelPayment(selectedPaymentId);
			isPaymentModalOpen = false;
			selectedPaymentId = null;
			await loadReservation();
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			cancelLoading = false;
		}
	}
</script>

<div class="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 fade-in flex justify-center items-start">
	<div class="w-full max-w-4xl">
		{#if loading}
			<div class="flex flex-col items-center justify-center py-20">
				<div class="h-12 w-12 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent mb-4"></div>
				<p class="text-slate-500 font-['Outfit'] tracking-widest uppercase text-sm dark:text-[#D4AF37]">Cargando información...</p>
			</div>
		{:else if error}
			<div class="rounded-xl border border-red-200 bg-red-50/80 backdrop-blur-sm p-6 text-center shadow-lg dark:border-red-900/30 dark:bg-red-500/10">
				<p class="text-red-600 font-medium dark:text-red-400">{error}</p>
			</div>
		{:else if reservation && reservation.room}
			<div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
				<div>
					<h2 class="font-['Outfit'] text-4xl font-light tracking-wide text-slate-800 dark:text-white mb-2">
						Detalles de <span class="text-[#D4AF37] font-semibold">Reserva</span>
					</h2>
					<p class="text-slate-500 dark:text-slate-400 font-medium tracking-widest text-sm uppercase">CÓDIGO: {reservation.unique_id}</p>
				</div>
				<div class="flex flex-col items-end gap-2">
					<span class="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border
						{reservation.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-700/50' : 
						 reservation.status === 'verifying' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700/50' : 
						 reservation.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700/50' : 
						 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50'}">
						{reservation.status === 'pending' ? 'Pendiente' : reservation.status === 'verifying' ? 'Verificando Pago' : reservation.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
					</span>
					{#if timeLeft && reservation.status === 'pending'}
						<div class="text-[10px] font-bold tracking-wider uppercase text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg border border-red-200 dark:border-red-800/30 shadow-sm animate-pulse">
							⏳ Expira en: {timeLeft}
						</div>
					{/if}

					{#if reservation.status === 'pending'}
						{#each (reservation.payments || []).filter(p => p.status === 'failed' && p.receipt_data?.rejection_reason) as failedPay}
							<div class="w-full max-w-xs mt-2 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl text-[11px] text-rose-700 dark:text-rose-400 shadow-sm animate-in slide-in-from-top-2 duration-500">
								<div class="flex gap-2">
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
									<p><strong>Pago Rechazado:</strong> {failedPay.receipt_data.rejection_reason}</p>
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>
			
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
				<div class="lg:col-span-2 rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-8 shadow-xl dark:border-slate-800/50 dark:bg-slate-900/60">
					<h3 class="font-['Outfit'] text-xl font-medium text-slate-800 dark:text-[#D4AF37] mb-6 border-b border-slate-200/50 dark:border-slate-700/50 pb-4">
						Información de Estadía
					</h3>
					
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
						<div>
							<p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Habitación</p>
							<p class="text-lg font-medium text-slate-800 dark:text-slate-200">{reservation.room.type} Suite</p>
							<p class="text-sm text-slate-500 dark:text-slate-400">No. {reservation.room.number}</p>
						</div>
						
						<div>
							<p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Huéspedes</p>
							<p class="text-lg font-medium text-slate-800 dark:text-slate-200">{reservation.guests} Persona{reservation.guests > 1 ? 's' : ''}</p>
						</div>
						
						<div>
							<p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Check-In</p>
							<p class="text-lg font-medium text-slate-800 dark:text-slate-200">{reservation.check_in}</p>
							<p class="text-sm text-slate-500 dark:text-slate-400">15:00 hrs</p>
						</div>
						
						<div>
							<p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Check-Out</p>
							<p class="text-lg font-medium text-slate-800 dark:text-slate-200">{reservation.check_out}</p>
							<p class="text-sm text-slate-500 dark:text-slate-400">12:00 hrs</p>
						</div>
					</div>
				</div>
				
				<div class="lg:col-span-1 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-slate-50 to-white backdrop-blur-xl p-8 shadow-xl dark:from-slate-800/80 dark:to-slate-900/80 flex flex-col justify-center items-center text-center relative overflow-hidden">
					<div class="absolute -top-10 -right-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl"></div>
					<div class="absolute -bottom-10 -left-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl"></div>
					
					<h3 class="font-['Outfit'] text-sm tracking-widest uppercase font-semibold text-slate-500 dark:text-[#D4AF37] mb-4 relative z-10">
						{(reservation.balance || 0) > 0 ? 'Saldo a Pagar' : (reservation.balance || 0) < 0 ? 'Saldo a Favor' : 'Costo Total'}
					</h3>
					<p class="text-5xl font-['Outfit'] font-light text-slate-800 dark:text-white relative z-10 mb-2">
						<span class="text-2xl text-[#D4AF37] font-semibold align-top mr-1">$</span>
						{#if (reservation.balance || 0) > 0}
							{Number(reservation.balance).toLocaleString('en-US', {minimumFractionDigits: 2})}
							<br><span class="text-sm text-slate-400">Total: ${Number(reservation.total_cost).toLocaleString()}</span>
						{:else if (reservation.balance || 0) < 0}
							{Number(Math.abs(reservation.balance!)).toLocaleString('en-US', {minimumFractionDigits: 2})}
							<br><span class="text-sm text-indigo-400">A tu favor por cambios</span>
						{:else}
							{Number(reservation.total_cost).toLocaleString('en-US', {minimumFractionDigits: 2})}
						{/if}
					</p>
					<p class="text-xs text-slate-400 dark:text-slate-500 relative z-10">Impuestos y cargos incluidos</p>
				</div>
			</div>

			<div class="flex flex-col sm:flex-row gap-4 justify-end items-center mt-10">
				<a href="/profile/reservations" class="w-full sm:w-auto px-8 py-3 rounded-xl border border-slate-300 bg-white/50 backdrop-blur-sm text-sm font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white text-center shadow-sm">
					Volver a Reservas
				</a>
				
				
				{#if (reservation.balance || 0) > 0 && reservation.status !== 'verifying'}
					<button class="w-full sm:w-auto px-8 py-3 rounded-xl border border-red-200 bg-red-50/50 text-sm font-bold uppercase tracking-widest text-red-600 transition hover:bg-red-100 dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 shadow-sm" onclick={handleCancel} disabled={cancelLoading}>
						{cancelLoading ? 'Procesando...' : 'Cancelar Reserva'}
					</button>
					<a href="/payments/{reservation.id}" class="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA8222] text-sm font-bold uppercase tracking-widest text-slate-900 transition hover:from-[#f3cd54] hover:to-[#c69a2b] shadow-lg shadow-[#D4AF37]/20 text-center">
						Proceder al Pago
					</a>
				{:else if reservation.status === 'confirmed'}
					<button class="w-full sm:w-auto px-8 py-3 rounded-xl border border-red-200 bg-red-50/50 text-sm font-bold uppercase tracking-widest text-red-600 transition hover:bg-red-100 dark:border-red-900/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 shadow-sm" onclick={handleCancel} disabled={cancelLoading}>
						{cancelLoading ? 'Procesando...' : 'Cancelar Reserva'}
					</button>
				{:else if reservation.status === 'verifying'}
					{@const verifyingPayment = reservation.payments?.find(p => p.status === 'verifying')}
					{#if verifyingPayment}
						<button class="w-full sm:w-auto px-8 py-3 rounded-xl border border-orange-200 bg-orange-50/50 text-sm font-bold uppercase tracking-widest text-orange-600 transition hover:bg-orange-100 shadow-sm dark:border-orange-900/30 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20" onclick={() => handleCancelPayment(verifyingPayment.id)} disabled={cancelLoading}>
							{cancelLoading ? 'Procesando...' : 'Cancelar Pago Pendiente'}
						</button>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>

<CancellationModal
	isOpen={isCancelModalOpen}
	reservation={reservation}
	onConfirm={confirmCancellation}
	onClose={() => (isCancelModalOpen = false)}
	loading={cancelLoading}
/>

<PaymentCancelModal
	isOpen={isPaymentModalOpen}
	onConfirm={confirmPaymentCancellation}
	onClose={() => (isPaymentModalOpen = false)}
	loading={cancelLoading}
/>

<style>
	.fade-in {
		animation: fadeIn 0.4s ease-out forwards;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
