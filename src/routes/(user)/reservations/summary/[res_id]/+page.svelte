<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { 
		getReservation, 
		cancelReservation, 
		cancelPayment,
		addClientReservationExtra,
		updateClientReservationExtra,
		removeClientReservationExtra
	} from '$lib/services/reservation.service';
	import { fetchPublicExtraAmenities } from '$lib/services/extra_amenity.service';
	import type { ExtraAmenityRead } from '$lib/services/extra_amenity.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import { onMount, onDestroy } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import CancellationModal from '$lib/components/ui/CancellationModal.svelte';
	import PaymentCancelModal from '$lib/components/ui/PaymentCancelModal.svelte';

	let resId = Number($page.params.res_id);
	let reservation = $state<ReservationRead | null>(null);
	let loading = $state(true);
	let cancelLoading = $state(false);
	
	// Extras state
	let catalog = $state<ExtraAmenityRead[]>([]);
	let catalogLoading = $state(true);
	let selectedCategory = $state('all');
	
	let isAddModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isDeleteExtraConfirmOpen = $state(false);
	
	let selectedAmenity = $state<ExtraAmenityRead | null>(null);
	let selectedPivotId = $state<number | null>(null);
	let pivotIdToDelete = $state<number | null>(null);
	
	let extraQuantity = $state(1);
	let extraNotes = $state('');
	let extraActionLoading = $state(false);

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
		
		const updatedAt = new Date(reservation.updated_at).getTime();
		const expiresAt = updatedAt + (24 * 60 * 60 * 1000);
		const now = new Date().getTime();
		const diff = expiresAt - now;

		if (diff <= 0) {
			timeLeft = "Expirado";
			if (timer) clearInterval(timer);
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

	async function loadCatalog() {
		try {
			catalog = await fetchPublicExtraAmenities();
		} catch (err: any) {
			console.error("Error al cargar el catálogo de amenidades:", err);
		} finally {
			catalogLoading = false;
		}
	}

	onMount(() => {
		loadReservation();
		loadCatalog();
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
			toast.success("Reservación cancelada exitosamente");
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
			toast.success("Pago en verificación cancelado");
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			cancelLoading = false;
		}
	}

	// Helper for check-in validation
	function checkInIsUpcoming(checkInStr: string) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const [y, m, d] = checkInStr.split('-').map(Number);
		const checkInDate = new Date(y, m - 1, d);
		return checkInDate > today;
	}

	// Extras handlers
	function handleOpenAddExtra(amenity: ExtraAmenityRead) {
		selectedAmenity = amenity;
		extraQuantity = 1;
		extraNotes = '';
		isAddModalOpen = true;
	}

	async function submitAddExtra() {
		if (!selectedAmenity) return;
		extraActionLoading = true;
		try {
			await addClientReservationExtra(resId, selectedAmenity.id, extraQuantity, extraNotes);
			isAddModalOpen = false;
			await loadReservation();
			toast.success(`¡"${selectedAmenity.name}" agregado a tu suite!`);
		} catch (err: any) {
			toast.error(err.message || "Error al agregar la amenidad");
		} finally {
			extraActionLoading = false;
		}
	}

	function handleOpenEditExtra(extra: any) {
		selectedPivotId = extra.id;
		selectedAmenity = extra.extra_amenity;
		extraQuantity = extra.quantity;
		extraNotes = extra.notes || '';
		isEditModalOpen = true;
	}

	async function submitEditExtra() {
		if (selectedPivotId === null || !selectedAmenity) return;
		extraActionLoading = true;
		try {
			await updateClientReservationExtra(resId, selectedPivotId, extraQuantity, extraNotes);
			isEditModalOpen = false;
			await loadReservation();
			toast.success(`Servicio "${selectedAmenity.name}" actualizado.`);
		} catch (err: any) {
			toast.error(err.message || "Error al actualizar la amenidad");
		} finally {
			extraActionLoading = false;
		}
	}

	function handleOpenDeleteExtra(pivotId: number) {
		pivotIdToDelete = pivotId;
		isDeleteExtraConfirmOpen = true;
	}

	async function confirmDeleteExtra() {
		if (pivotIdToDelete === null) return;
		extraActionLoading = true;
		try {
			await removeClientReservationExtra(resId, pivotIdToDelete);
			isDeleteExtraConfirmOpen = false;
			pivotIdToDelete = null;
			await loadReservation();
			toast.success("Servicio eliminado de tu reserva.");
		} catch (err: any) {
			toast.error(err.message || "Error al eliminar la amenidad");
		} finally {
			extraActionLoading = false;
		}
	}

	// Categories filter helper
	let categories = $derived(() => {
		const cats = new Set<string>();
		catalog.forEach(item => {
			if (item.category?.name) cats.add(item.category.name);
		});
		return ['all', ...Array.from(cats)];
	});

	let filteredCatalog = $derived(() => {
		if (selectedCategory === 'all') return catalog;
		return catalog.filter(item => item.category?.name === selectedCategory);
	});
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
				<div class="lg:col-span-2 space-y-6">
					<div class="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-8 shadow-xl dark:border-slate-800/50 dark:bg-slate-900/60">
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

					{#if reservation.extras && reservation.extras.length > 0}
						<div class="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-8 shadow-xl dark:border-slate-800/50 dark:bg-slate-900/60 animate-in fade-in duration-300">
							<h3 class="font-['Outfit'] text-xl font-medium text-slate-800 dark:text-[#D4AF37] mb-6 border-b border-slate-200/50 dark:border-slate-700/50 pb-4 flex items-center gap-2">
								⭐ Servicios Extras Contratados
							</h3>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#each reservation.extras as extra}
									<div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4">
										<div class="flex items-center gap-3 min-w-0">
											<div class="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
												{#if extra.extra_amenity.image_url}
													<img src={extra.extra_amenity.image_url} alt={extra.extra_amenity.name} class="w-full h-full object-cover" />
												{:else}
													<span class="text-xl">{extra.extra_amenity.icon || '⭐'}</span>
												{/if}
											</div>
											<div class="min-w-0">
												<p class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{extra.extra_amenity.name}</p>
												<p class="text-xs text-slate-500 mt-0.5">{extra.quantity} x ${Number(extra.unit_price).toFixed(2)}</p>
												{#if extra.notes}
													<p class="text-[10px] text-slate-400 mt-1 italic truncate">"{extra.notes}"</p>
												{/if}
											</div>
										</div>
										<div class="text-right flex flex-col items-end gap-1.5 shrink-0">
											<p class="text-sm font-bold text-slate-800 dark:text-slate-200">${Number(extra.total_price).toFixed(2)}</p>
											<span class="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider {extra.payment_status === 'paid' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'}">
												{extra.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
											</span>
											{#if extra.payment_status === 'pending' && checkInIsUpcoming(reservation.check_in) && reservation.status !== 'cancelled'}
												<div class="flex gap-1.5 mt-1">
													<button 
														onclick={() => handleOpenEditExtra(extra)}
														class="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all shadow-sm"
														title="Modificar cantidad o notas"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
													</button>
													<button 
														onclick={() => handleOpenDeleteExtra(extra.id)}
														class="p-1.5 rounded-lg border border-red-100 dark:border-red-950/30 bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-all shadow-sm"
														title="Eliminar extra"
													>
														<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
													</button>
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if checkInIsUpcoming(reservation.check_in) && reservation.status !== 'cancelled'}
						<div class="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-8 shadow-xl dark:border-slate-800/50 dark:bg-slate-900/60 animate-in fade-in duration-300 space-y-6">
							<div class="border-b border-slate-200/50 dark:border-slate-700/50 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
								<div>
									<h3 class="font-['Outfit'] text-xl font-medium text-slate-800 dark:text-[#D4AF37] flex items-center gap-2">
										✨ Mejora tu Experiencia
									</h3>
									<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Personaliza tu estancia con servicios y amenidades exclusivas.</p>
								</div>
								
								<!-- Categories Filter Tabs -->
								{#if categories().length > 2}
									<div class="flex gap-1 overflow-x-auto pb-1 scrollbar-none shrink-0 bg-slate-100/80 dark:bg-slate-950/40 p-1 rounded-xl">
										{#each categories() as cat}
											<button 
												onclick={() => selectedCategory = cat}
												class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap
													{selectedCategory === cat 
														? 'bg-white dark:bg-slate-800 text-[#D4AF37] shadow-sm' 
														: 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}"
											>
												{cat === 'all' ? 'Todos' : cat}
											</button>
										{/each}
									</div>
								{/if}
							</div>

							{#if catalogLoading}
								<div class="flex justify-center py-10">
									<div class="h-6 w-6 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent"></div>
								</div>
							{:else if filteredCatalog().length === 0}
								<p class="text-xs text-slate-450 text-center py-6">No hay amenidades disponibles en esta categoría en este momento.</p>
							{:else}
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{#each filteredCatalog() as item}
										<div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 overflow-hidden flex flex-col justify-between hover:border-[#D4AF37]/50 transition-all group duration-300">
											<div class="relative h-28 overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
												{#if item.image_url}
													<img src={item.image_url} alt={item.name} class="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
												{:else}
													<div class="w-full h-full flex items-center justify-center text-4xl opacity-50 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-850">
														{item.icon || '⭐'}
													</div>
												{/if}
												{#if item.category?.name}
													<span class="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/10 shadow-sm">
														{item.category.name}
													</span>
												{/if}
											</div>
											
											<div class="p-4 flex-1 flex flex-col justify-between gap-4">
												<div class="space-y-1">
													<div class="flex justify-between items-start gap-2">
														<h4 class="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">{item.name}</h4>
														<span class="text-xs font-black text-[#D4AF37] font-['Outfit'] shrink-0">${Number(item.price).toFixed(2)}</span>
													</div>
													{#if item.description}
														<p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
													{/if}
												</div>
												
												<button 
													onclick={() => handleOpenAddExtra(item)}
													class="w-full py-2 bg-slate-900 hover:bg-[#D4AF37] dark:bg-slate-850 dark:hover:bg-[#D4AF37] text-white hover:text-slate-950 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:shadow-md"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
													Contratar
												</button>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
				
				<div class="lg:col-span-1 lg:sticky lg:top-24 h-fit rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-slate-50 to-white backdrop-blur-xl p-8 shadow-xl dark:from-slate-800/80 dark:to-slate-900/80 flex flex-col justify-between relative overflow-hidden min-h-[320px]">
					<div class="absolute -top-10 -right-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl"></div>
					<div class="absolute -bottom-10 -left-10 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl"></div>
					
					<div class="relative z-10 space-y-4 w-full text-left">
						<h3 class="font-['Outfit'] text-sm tracking-widest uppercase font-semibold text-slate-500 dark:text-[#D4AF37] border-b border-slate-200 dark:border-slate-700/50 pb-2">
							Resumen Financiero
						</h3>
						
						<div class="space-y-2.5 text-xs">
							<div class="flex justify-between">
								<span class="text-slate-500 dark:text-slate-400">Habitación (con Impuestos)</span>
								<span class="font-bold text-slate-800 dark:text-slate-200">${Number(reservation.total_cost).toFixed(2)}</span>
							</div>
							
							{#if Number(reservation.extras_total || 0) > 0}
								<div class="flex justify-between">
									<span class="text-slate-500 dark:text-slate-400">Extras contratados</span>
									<span class="font-bold text-slate-800 dark:text-slate-200">${Number(reservation.extras_total).toFixed(2)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-slate-500 dark:text-slate-400">IVA Extras (13%)</span>
									<span class="font-bold text-slate-800 dark:text-slate-200">${(Number(reservation.extras_total) * 0.13).toFixed(2)}</span>
								</div>
							{/if}
							
							<div class="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-2.5 font-['Outfit'] text-sm">
								<span class="font-medium text-slate-600 dark:text-slate-300">Gran Total</span>
								<span class="font-black text-[#D4AF37]">${Number(reservation.grand_total ?? reservation.total_cost).toFixed(2)}</span>
							</div>
							
							<div class="flex justify-between border-t border-dotted border-slate-200 dark:border-slate-700 pt-2.5 text-xs">
								<span class="text-slate-500 dark:text-slate-400">Total Pagado</span>
								<span class="font-bold text-green-600 dark:text-green-400">${Number(reservation.total_paid || 0).toFixed(2)}</span>
							</div>
						</div>
					</div>
					
					<div class="relative z-10 text-center mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/50 w-full">
						<p class="text-[10px] font-black text-slate-500 dark:text-[#D4AF37]/80 uppercase tracking-widest mb-1">
							{(reservation.balance || 0) > 0 ? 'Saldo Pendiente' : (reservation.balance || 0) < 0 ? 'Saldo a Favor' : 'Folio Saldado'}
						</p>
						<p class="text-4xl font-['Outfit'] font-black {(reservation.balance || 0) < 0 ? 'text-indigo-500 dark:text-indigo-400' : (reservation.balance || 0) > 0 ? 'text-rose-500' : 'text-emerald-500'}">
							${Math.abs(Number(reservation.balance || 0)).toFixed(2)}
						</p>
						<p class="text-[9px] text-slate-400 dark:text-slate-500 mt-2">Cargos e impuestos incluidos</p>
					</div>
				</div>
			</div>

			{#if reservation.status === 'confirmed' && Number(reservation.balance || 0) > 0}
				<div class="mt-8 p-5 rounded-2xl border border-fuchsia-350 bg-gradient-to-r from-fuchsia-50/40 to-white/40 backdrop-blur-xl dark:border-fuchsia-900/30 dark:from-fuchsia-950/10 dark:to-transparent flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-fuchsia-500/5 animate-pulse text-left">
					<div class="flex items-start gap-3">
						<div class="w-10 h-10 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950/60 flex items-center justify-center shrink-0 text-fuchsia-600 dark:text-fuchsia-400 text-lg">
							🔔
						</div>
						<div>
							<h4 class="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-300">¡Servicios Adicionales Pendientes de Pago!</h4>
							<p class="text-xs text-fuchsia-700/80 dark:text-fuchsia-400/80 mt-1 leading-relaxed">
								Has agregado nuevas experiencias a tu estancia. Por favor, liquida el saldo pendiente de <strong>${Number(reservation.balance).toFixed(2)}</strong> para garantizar la reserva de tus servicios extras.
							</p>
						</div>
					</div>
					<a href="/payments/{reservation.id}" class="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-fuchsia-805 hover:from-fuchsia-500 hover:to-fuchsia-700 text-xs font-bold uppercase tracking-widest text-white transition-all shadow-md shadow-fuchsia-600/10 text-center shrink-0">
						Pagar Saldo
					</a>
				</div>
			{/if}

			<div class="flex flex-col sm:flex-row gap-4 justify-end items-center mt-10">
				<a href="/profile/reservations" class="w-full sm:w-auto px-8 py-3 rounded-xl border border-slate-300 bg-white/50 backdrop-blur-sm text-sm font-bold uppercase tracking-widest text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white text-center shadow-sm">
					Volver a Reservas
				</a>
				
				{#if reservation.status !== 'cancelled' && reservation.status !== 'completed'}
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
						{#if Number(reservation.balance || 0) > 0}
							<a href="/payments/{reservation.id}" class="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-fuchsia-800 text-sm font-bold uppercase tracking-widest text-white transition hover:from-fuchsia-500 hover:to-fuchsia-700 shadow-lg shadow-fuchsia-600/20 text-center">
								Pagar Saldo Extra
							</a>
						{/if}
					{:else if reservation.status === 'verifying'}
						{@const verifyingPayment = reservation.payments?.find(p => p.status === 'verifying')}
						{#if verifyingPayment}
							<button class="w-full sm:w-auto px-8 py-3 rounded-xl border border-orange-200 bg-orange-50/50 text-sm font-bold uppercase tracking-widest text-orange-600 transition hover:bg-orange-100 shadow-sm dark:border-orange-900/30 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/20" onclick={() => handleCancelPayment(verifyingPayment.id)} disabled={cancelLoading}>
								{cancelLoading ? 'Procesando...' : 'Cancelar Pago Pendiente'}
							</button>
						{/if}
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

<!-- Modal Contratar Extra -->
{#if isAddModalOpen && selectedAmenity}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
		<div class="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative overflow-hidden text-left">
			<button 
				onclick={() => isAddModalOpen = false} 
				class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-205 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
			</button>

			<h3 class="font-['Outfit'] text-2xl font-bold text-slate-800 dark:text-[#D4AF37] mb-2">Contratar Servicio</h3>
			<p class="text-xs text-slate-500 mb-6 font-medium">Añade esta experiencia premium a tu estancia en el resort.</p>

			<div class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 mb-6">
				<div class="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
					{#if selectedAmenity.image_url}
						<img src={selectedAmenity.image_url} alt={selectedAmenity.name} class="w-full h-full object-cover" />
					{:else}
						<span class="text-2xl">{selectedAmenity.icon || '⭐'}</span>
					{/if}
				</div>
				<div>
					<h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedAmenity.name}</h4>
					<p class="text-xs font-black text-[#D4AF37] mt-0.5">${Number(selectedAmenity.price).toFixed(2)} por unidad</p>
				</div>
			</div>

			<div class="space-y-4">
				<div class="space-y-1.5">
					<label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Cantidad</label>
					<div class="flex items-center gap-3">
						<button 
							onclick={() => extraQuantity = Math.max(1, extraQuantity - 1)}
							class="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center font-black transition-all shadow-sm"
						>
							-
						</button>
						<span class="w-12 text-center text-sm font-black text-slate-800 dark:text-slate-100">{extraQuantity}</span>
						<button 
							onclick={() => extraQuantity = Math.min(50, extraQuantity + 1)}
							class="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center font-black transition-all shadow-sm"
						>
							+
						</button>
					</div>
				</div>

				<div class="space-y-1.5">
					<label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Notas / Instrucciones Especiales</label>
					<textarea 
						bind:value={extraNotes}
						placeholder="Ej: Alergias alimenticias, horarios de preferencia, detalles especiales..."
						class="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] placeholder-slate-400 resize-none h-20 transition-all"
					></textarea>
				</div>
			</div>

			<div class="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
				<div>
					<span class="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Total a Pagar</span>
					<span class="text-xl font-black text-[#D4AF37]">${(Number(selectedAmenity.price) * extraQuantity).toFixed(2)}</span>
				</div>
				<button 
					onclick={submitAddExtra}
					disabled={extraActionLoading}
					class="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA8222] hover:from-[#f3cd54] hover:to-[#c69a2b] text-slate-900 text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-md shadow-[#D4AF37]/20 flex items-center gap-2"
				>
					{#if extraActionLoading}
						<span class="inline-block w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
					{/if}
					Añadir a mi Suite
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Modificar Extra -->
{#if isEditModalOpen && selectedAmenity}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
		<div class="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative overflow-hidden text-left">
			<button 
				onclick={() => isEditModalOpen = false} 
				class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-205 transition-colors"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
			</button>

			<h3 class="font-['Outfit'] text-2xl font-bold text-slate-800 dark:text-[#D4AF37] mb-2">Modificar Servicio</h3>
			<p class="text-xs text-slate-500 mb-6 font-medium">Ajusta los detalles de tu servicio extra contratado.</p>

			<div class="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 mb-6">
				<div class="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
					{#if selectedAmenity.image_url}
						<img src={selectedAmenity.image_url} alt={selectedAmenity.name} class="w-full h-full object-cover" />
					{:else}
						<span class="text-2xl">{selectedAmenity.icon || '⭐'}</span>
					{/if}
				</div>
				<div>
					<h4 class="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedAmenity.name}</h4>
					<p class="text-xs font-black text-[#D4AF37] mt-0.5">${Number(selectedAmenity.price).toFixed(2)} por unidad</p>
				</div>
			</div>

			<div class="space-y-4">
				<div class="space-y-1.5">
					<label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Cantidad</label>
					<div class="flex items-center gap-3">
						<button 
							onclick={() => extraQuantity = Math.max(1, extraQuantity - 1)}
							class="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center font-black transition-all shadow-sm"
						>
							-
						</button>
						<span class="w-12 text-center text-sm font-black text-slate-800 dark:text-slate-100">{extraQuantity}</span>
						<button 
							onclick={() => extraQuantity = Math.min(50, extraQuantity + 1)}
							class="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center font-black transition-all shadow-sm"
						>
							+
						</button>
					</div>
				</div>

				<div class="space-y-1.5">
					<label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Notas / Instrucciones Especiales</label>
					<textarea 
						bind:value={extraNotes}
						placeholder="Ej: Alergias alimenticias, horarios de preferencia, detalles especiales..."
						class="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] placeholder-slate-400 resize-none h-20 transition-all"
					></textarea>
				</div>
			</div>

			<div class="mt-8 pt-4 border-t border-slate-100 dark:border-slate-855 flex justify-between items-center">
				<div>
					<span class="block text-[9px] font-bold uppercase tracking-widest text-slate-400">Nuevo Total</span>
					<span class="text-xl font-black text-[#D4AF37]">${(Number(selectedAmenity.price) * extraQuantity).toFixed(2)}</span>
				</div>
				<button 
					onclick={submitEditExtra}
					disabled={extraActionLoading}
					class="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA8222] hover:from-[#f3cd54] hover:to-[#c69a2b] text-slate-900 text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-md shadow-[#D4AF37]/20 flex items-center gap-2"
				>
					{#if extraActionLoading}
						<span class="inline-block w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
					{/if}
					Guardar Cambios
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Confirmación Eliminar Extra -->
{#if isDeleteExtraConfirmOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
		<div class="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 relative overflow-hidden text-center">
			<div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-4 text-xl">
				⚠️
			</div>
			
			<h3 class="font-['Outfit'] text-xl font-bold text-slate-800 dark:text-white mb-2">¿Eliminar servicio extra?</h3>
			<p class="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium leading-relaxed">Esta acción removerá esta experiencia de tu reservación y el costo será descontado de tu saldo pendiente de forma inmediata.</p>

			<div class="flex gap-4">
				<button 
					onclick={() => isDeleteExtraConfirmOpen = false}
					class="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-850 transition-all"
				>
					Volver
				</button>
				<button 
					onclick={confirmDeleteExtra}
					disabled={extraActionLoading}
					class="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2"
				>
					{#if extraActionLoading}
						<span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
					{/if}
					Sí, Eliminar
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.fade-in {
		animation: fadeIn 0.4s ease-out forwards;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
