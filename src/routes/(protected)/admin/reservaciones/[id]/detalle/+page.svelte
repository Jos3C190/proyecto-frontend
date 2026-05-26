<script lang="ts">
	import { page as sveltePage } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { 
		getReservation, 
		updateAdminReservation,
		payAdminReservation,
		getAdminWompiLink,
		refundReservation,
		addAdminReservationExtra,
		removeAdminReservationExtra,
		payAdminReservationExtra
	} from '$lib/services/reservation.service';
	import { fetchExtraAmenities, type ExtraAmenityRead } from '$lib/services/extra_amenity.service';
	import type { ReservationRead, AdminReservationUpdate, AdminPaymentCreate } from '$lib/types/reservation';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import '../../../adminPage.css';

	let id = $derived(Number($sveltePage.params.id));
	let reservation = $state<ReservationRead | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let cancelling = $state(false);
	let refunding = $state(false);

	let isConfirmModalOpen = $state(false);
	let modalConfig = $state<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null);

	// Extras State
	let availableExtras = $state<ExtraAmenityRead[]>([]);
	let showAddExtraModal = $state(false);
	let selectedExtraId = $state<number | ''>('');
	let extraQuantity = $state(1);
	let extraNotes = $state('');
	let addingExtra = $state(false);

	let hasReadAccess = $derived(hasPermission($authStore.user, 'reservations', 'read'));
	let hasUpdateAccess = $derived(hasPermission($authStore.user, 'reservations', 'update'));

	async function loadReservation() {
		loading = true;
		error = null;
		try {
			reservation = await getReservation(id);
		} catch (err: any) {
			error = err.message;
			toast.error('Error al cargar reservación: ' + err.message);
		} finally {
			loading = false;
		}
	}

	async function loadAvailableExtras() {
		try {
			// Solo cargamos los activos
			availableExtras = await fetchExtraAmenities(false);
		} catch (err: any) {
			console.error("Error cargando extras:", err);
		}
	}

	async function handleAddExtra() {
		if (!reservation || !selectedExtraId || extraQuantity < 1) return;
		addingExtra = true;
		try {
			await addAdminReservationExtra(reservation.id, Number(selectedExtraId), extraQuantity, extraNotes);
			toast.success('Servicio extra agregado exitosamente');
			showAddExtraModal = false;
			selectedExtraId = '';
			extraQuantity = 1;
			extraNotes = '';
			await loadReservation(); // Reload to get updated extras and totals
		} catch (e: any) {
			toast.error(e.message || 'Error al agregar extra');
		} finally {
			addingExtra = false;
		}
	}

	async function handleRemoveExtra(pivotId: number) {
		if (!reservation) return;
		modalConfig = {
			title: 'Eliminar Extra',
			message: '¿Estás seguro de eliminar este servicio extra de la reservación?',
			onConfirm: async () => {
				try {
					await removeAdminReservationExtra(reservation!.id, pivotId);
					toast.success('Servicio extra eliminado');
					await loadReservation();
				} catch (e: any) {
					toast.error(e.message || 'Error al eliminar extra');
				}
			}
		};
		isConfirmModalOpen = true;
	}

	async function handlePayExtra(pivotId: number) {
		if (!reservation) return;
		modalConfig = {
			title: 'Registrar Pago de Extra',
			message: '¿Confirmas que el huésped ya pagó por este servicio extra?',
			onConfirm: async () => {
				try {
					await payAdminReservationExtra(reservation!.id, pivotId);
					toast.success('Pago de extra registrado');
					await loadReservation();
				} catch (e: any) {
					toast.error(e.message || 'Error al procesar pago');
				}
			}
		};
		isConfirmModalOpen = true;
	}

	async function handleCancel() {
		if (!reservation) return;
		
		modalConfig = {
			title: 'Cancelar Reservación',
			message: `¿Estás seguro de cancelar la reservación ${reservation.unique_id}? Esta acción no se puede deshacer.`,
			onConfirm: async () => {
				cancelling = true;
				try {
					await updateAdminReservation(reservation.id, { status: 'cancelled' } as AdminReservationUpdate);
					toast.success('Reservación cancelada exitosamente');
					await loadReservation();
				} catch (e: any) {
					toast.error(e.message || 'Error al cancelar la reservación');
				} finally {
					cancelling = false;
				}
			}
		};
		isConfirmModalOpen = true;
	}

	async function handleRefund() {
		if (!reservation) return;

		modalConfig = {
			title: 'Procesar Reembolso',
			message: '¿Estás seguro de procesar la devolución de saldo para esta reservación? Se registrará una transacción de reembolso para dejar el balance en cero.',
			onConfirm: async () => {
				refunding = true;
				try {
					await refundReservation(reservation.id);
					toast.success('Reembolso registrado exitosamente');
					await loadReservation();
				} catch (e: any) {
					toast.error(e.message || 'Error al procesar el reembolso');
				} finally {
					refunding = false;
				}
			}
		};
		isConfirmModalOpen = true;
	}

	function handleBack() {
		goto('/admin/reservaciones');
	}

	function goToEdit() {
		goto(`/admin/reservaciones/${id}/editar`);
	}

	function goToPayment() {
		// Redirigir a la página de nueva con parámetros para pagar esta
		// O quizás implementar el pago aquí mismo si es sencillo.
		// El modal de creación tenía el "Step 2" de pago.
		// Por consistencia, podríamos tener una página de pago o usar la de "nueva" con un flag.
		// Pero para este refactor, vamos a permitir iniciar el flujo de pago desde aquí.
		goto(`/admin/reservaciones/nueva?resId=${id}&step=2`);
	}

	onMount(() => {
		if (!hasReadAccess) {
			goto('/dashboard');
			return;
		}
		loadReservation();
		loadAvailableExtras();
	});

	const statusColors: Record<string, string> = {
		'confirmed': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
		'pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
		'verifying': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
		'cancelled': 'bg-rose-500/10 text-rose-600 border-rose-500/20'
	};

	function formatDateTime(dateStr: string) {
		if (!dateStr) return '---';
		const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
		if (match) {
			const [_, y, m, d, hh, mm, ss] = match;
			const hour = parseInt(hh);
			const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
			const h12 = hour % 12 || 12;
			return `${parseInt(d)}/${parseInt(m)}/${y}, ${h12}:${mm}:${ss} ${ampm}`;
		}
		return dateStr;
	}

	function formatMethod(m: string) {
		const map: any = { card: 'Tarjeta', cash: 'Efectivo', transfer: 'Transferencia', refund: 'Reembolso' };
		return map[m] || m;
	}

	function formatStatus(s: string) {
		const map: any = { completed: 'Completado', verifying: 'Verificando', failed: 'Fallido/Rechazado' };
		return map[s] || s;
	}
</script>

<svelte:head>
	<title>Admin - Detalle Reservación {reservation?.unique_id || ''}</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20">
    <div class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                <a href="/admin/reservaciones" class="hover:text-[#D4AF37] transition-colors">Reservaciones</a>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="text-slate-900 dark:text-slate-200">Detalles del Folio</span>
                {#if reservation}
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    <span class="text-[#D4AF37] font-bold">{reservation.unique_id}</span>
                {/if}
            </nav>
            
            <button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all" onclick={handleBack}>
                <div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <span class="text-xs font-black uppercase tracking-widest">Listado Global</span>
            </button>
        </div>

        {#if reservation}
            <div class="flex items-center gap-3">
                <div class="text-right mr-4 hidden sm:block">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Reserva</p>
                    <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter {statusColors[reservation.status] || 'bg-slate-100 text-slate-500'} border">
                        {reservation.status}
                    </span>
                </div>
                {#if hasUpdateAccess && reservation.status !== 'cancelled'}
                    <button class="admin-btn-secondary px-6 !py-3" onclick={goToEdit}>
                        Editar Reserva
                    </button>
                    {#if reservation.balance > 0 && reservation.status !== 'verifying'}
                        <button class="admin-btn px-6 !py-3" onclick={goToPayment}>
                             Registrar Pago
                        </button>
                    {/if}
                {/if}
            </div>
        {/if}
    </div>

	{#if loading}
        <div class="flex flex-col items-center justify-center p-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6"></div>
            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Consultando folio bancario y reserva...</p>
        </div>
    {:else if error}
        <div class="p-10 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[32px] text-center">
            <p class="text-red-600 dark:text-red-400 font-bold mb-4">{error}</p>
            <button class="admin-btn" onclick={loadReservation}>Reintentar</button>
        </div>
    {:else if reservation}
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- Columna Izquierda: Información Principal (7/12) -->
            <div class="lg:col-span-7 space-y-8">
                <!-- Card: Detalles del Cliente y Habitación -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <!-- Sección Cliente -->
                        <div>
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                    👤
                                </div>
                                <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Datos del Titular</h3>
                            </div>
                            {#if reservation.user}
                                <div class="space-y-4">
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre Completo</p>
                                        <p class="text-sm font-bold text-slate-800 dark:text-slate-200">
                                            {#if reservation.user.profile}
                                                {reservation.user.profile.person_type === 'Juridica' ? (reservation.user.profile.business_name || reservation.user.profile.first_name) : `${reservation.user.profile.first_name} ${reservation.user.profile.last_name === 'N/A' ? '' : reservation.user.profile.last_name || ''}`}
                                            {:else}
                                                Perfil no configurado
                                            {/if}
                                        </p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Correo Electrónico</p>
                                        <p class="text-sm font-medium text-slate-600 dark:text-slate-400">{reservation.user.email}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Usuario</p>
                                        <p class="text-xs font-mono text-slate-500">#{reservation.user.id}</p>
                                    </div>
                                </div>
                            {:else}
                                <p class="text-sm text-slate-400 italic">No se pudo cargar la información del usuario titular.</p>
                            {/if}
                        </div>

                        <!-- Sección Habitación -->
                        <div>
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                    🛏️
                                </div>
                                <h3 class="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">Unidad Asignada</h3>
                            </div>
                            {#if reservation.room}
                                <div class="space-y-4">
                                    <div class="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Número de Suite</p>
                                        <p class="text-2xl font-black text-[#D4AF37]">#{reservation.room.number}</p>
                                        <p class="text-[10px] uppercase font-bold text-slate-500 mt-1">{reservation.room.type}</p>
                                    </div>
                                    <div class="flex gap-6">
                                        <div>
                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Capacidad</p>
                                            <p class="text-xs font-bold text-slate-700 dark:text-slate-200">{reservation.room.capacity} Pax</p>
                                        </div>
                                        <div>
                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tarifa Base</p>
                                            <p class="text-xs font-bold text-slate-700 dark:text-slate-200">${reservation.room.base_price}</p>
                                        </div>
                                    </div>
                                </div>
                            {:else}
                                <p class="text-sm text-slate-400 italic">Información de habitación no disponible.</p>
                            {/if}
                        </div>
                    </div>
                </section>

                <!-- Card: Itinerario y Estancia -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <div class="flex items-center gap-3 mb-8">
                        <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500 font-bold">
                            📅
                        </div>
                        <h3 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Itinerario de Estancia</h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div class="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-[24px] border border-slate-100 dark:border-slate-800 text-center">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Check-in</p>
                            <p class="text-lg font-black text-slate-800 dark:text-slate-100">{reservation.check_in}</p>
                            <p class="text-[10px] text-slate-500 mt-1 uppercase font-bold">15:00 PM</p>
                        </div>
                        <div class="flex items-center justify-center">
                            <div class="h-px bg-slate-200 dark:bg-slate-800 w-full relative">
                                <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-slate-900 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hacia</span>
                            </div>
                        </div>
                        <div class="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-[24px] border border-slate-100 dark:border-slate-800 text-center">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Check-out</p>
                            <p class="text-lg font-black text-slate-800 dark:text-slate-100">{reservation.check_out}</p>
                            <p class="text-[10px] text-slate-500 mt-1 uppercase font-bold">11:00 AM</p>
                        </div>
                    </div>

                    <div class="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <svg class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-width="2"/></svg>
                            </div>
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ocupación Registrada</p>
                                <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{reservation.guests} Huéspedes en total</p>
                            </div>
                        </div>
                        {#if reservation.status !== 'cancelled'}
                             <button class="admin-btn-secondary px-5 !py-2 text-[10px] hover:!bg-rose-500/5 hover:!text-rose-500 hover:!border-rose-500/20" onclick={handleCancel} disabled={cancelling}>
                                {cancelling ? 'Anulando...' : 'Anular Reservación'}
                             </button>
                        {/if}
                    </div>
                </section>

                <!-- Card: Amenidades Extras -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <div class="flex items-center justify-between mb-8">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-500 font-bold">
                                ⭐
                            </div>
                            <h3 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Servicios Extras</h3>
                        </div>
                        {#if hasUpdateAccess && (reservation.status === 'pending' || reservation.status === 'confirmed' || reservation.status === 'verifying')}
                            <button 
                                class="px-4 py-2 bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400 rounded-xl text-xs font-bold hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40 transition-colors flex items-center gap-2 border border-fuchsia-200 dark:border-fuchsia-800/30"
                                onclick={() => showAddExtraModal = true}
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                Agregar Extra
                            </button>
                        {/if}
                    </div>

                    {#if reservation.extras && reservation.extras.length > 0}
                        <div class="space-y-4">
                            {#each reservation.extras as extra}
                                <div class="p-5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-fuchsia-500/20 transition-all">
                                    <div class="flex items-start gap-4">
                                        <div class="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                                            {#if extra.extra_amenity.image_url}
                                                <img src={extra.extra_amenity.image_url} alt="Extra" class="w-full h-full object-cover" />
                                            {:else}
                                                <span class="text-2xl">{extra.extra_amenity.icon ? '✨' : '⭐'}</span>
                                            {/if}
                                        </div>
                                        <div>
                                            <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">{extra.extra_amenity.name}</h4>
                                            <p class="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{extra.quantity} x ${extra.unit_price} = <span class="text-fuchsia-600 dark:text-fuchsia-400">${extra.total_price}</span></p>
                                            {#if extra.notes}
                                                <p class="text-xs text-slate-500 mt-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg italic">"{extra.notes}"</p>
                                            {/if}
                                        </div>
                                    </div>
                                    <div class="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3">
                                        <span class="text-[9px] font-black uppercase px-2 py-1 rounded {extra.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'}">
                                            {extra.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                                        </span>
                                        
                                        {#if hasUpdateAccess && (reservation.status === 'pending' || reservation.status === 'confirmed' || reservation.status === 'verifying')}
                                            <div class="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                {#if extra.payment_status === 'pending'}
                                                    <button 
                                                        class="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/50" 
                                                        title="Marcar como pagado"
                                                        onclick={() => handlePayExtra(extra.id)}
                                                    >
                                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                    </button>
                                                {/if}
                                                <button 
                                                    class="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50" 
                                                    title="Eliminar extra"
                                                    onclick={() => handleRemoveExtra(extra.id)}
                                                >
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                            
                            <div class="p-4 bg-fuchsia-50/50 dark:bg-fuchsia-900/10 border border-fuchsia-100 dark:border-fuchsia-900/20 rounded-2xl flex justify-between items-center mt-6">
                                <div>
                                    <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Extras</p>
                                    <p class="text-xl font-black text-fuchsia-600 dark:text-fuchsia-400">${reservation.extras_total}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pendiente de Pago</p>
                                    <p class="text-xl font-black {reservation.extras_pending > 0 ? 'text-orange-500' : 'text-emerald-500'}">${reservation.extras_pending}</p>
                                </div>
                            </div>
                        </div>
                    {:else}
                        <div class="text-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Sin servicios adicionales</p>
                            <p class="text-xs text-slate-500">Esta reservación no cuenta con extras contratados.</p>
                        </div>
                    {/if}
                </section>
            </div>

            <!-- Columna Derecha: Finanzas e Historial (5/12) -->
            <aside class="lg:col-span-5 space-y-8 lg:sticky lg:top-8">
                <!-- Card: Resumen Financiero -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50 relative overflow-hidden">
                    <div class="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                    
                    <div class="flex items-center gap-3 mb-8 relative">
                        <div class="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                            💰
                        </div>
                        <h3 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-white uppercase tracking-wide">Balance del Folio</h3>
                    </div>

                    <div class="space-y-6 relative">
                        <div class="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hospedaje</span>
                            <span class="text-lg font-black text-slate-900 dark:text-white tracking-tighter">${reservation.total_cost}</span>
                        </div>
                        {#if Number(reservation.extras_total || 0) > 0}
                            <div class="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Extras + IVA</span>
                                <span class="text-lg font-black text-slate-900 dark:text-white tracking-tighter">${(Number(reservation.extras_total) * 1.13).toFixed(2)}</span>
                            </div>
                        {/if}
                        <div class="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4 mt-2">
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Costo Gran Total</span>
                            <span class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">${reservation.grand_total ? Number(reservation.grand_total).toFixed(2) : reservation.total_cost}</span>
                        </div>
                        <div class="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4">
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pagos Registrados</span>
                            <span class="text-2xl font-black text-emerald-500 tracking-tighter">${reservation.total_paid || 0}</span>
                        </div>
                        <div class="pt-4 text-center">
                            <p class="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 leading-none">
                                {(reservation.balance || 0) < 0 ? 'Saldo a Favor' : 'Pago Pendiente'}
                            </p>
                            <p class="text-6xl font-black tracking-tighter {(reservation.balance || 0) < 0 ? 'text-indigo-400' : 'text-rose-500'}">
                                ${(Math.abs(reservation.balance || 0))}
                            </p>
                        </div>

                        {#if reservation.balance > 0 && reservation.status !== 'verifying' && reservation.status !== 'cancelled'}
                            <button class="w-full admin-btn !py-4 mt-4 shadow-amber-500/20" onclick={goToPayment}>
                                Registrar Nuevo Pago
                            </button>
                        {/if}

                        {#if (reservation.balance || 0) < 0 && hasUpdateAccess}
                            <button class="w-full admin-btn !py-4 mt-4 shadow-indigo-500/20 !bg-indigo-600 hover:!bg-indigo-700" onclick={handleRefund} disabled={refunding}>
                                {refunding ? 'Procesando...' : 'Devolver Saldo a Favor'}
                            </button>
                        {/if}
                    </div>
                </section>

                <!-- Card: Historial de Transacciones -->
                <section class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
                    <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Historial de Transacciones</h3>
                    
                    <div class="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {#if reservation.payments && reservation.payments.length > 0}
                            {#each reservation.payments as pay}
                                <div class="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl flex justify-between items-center group hover:border-emerald-500/20 transition-all">
                                    <div>
                                        <p class="text-sm font-black text-emerald-600">${pay.amount}</p>
                                        <p class="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-tighter">{formatMethod(pay.method)} • {formatDateTime(pay.created_at)}</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded {pay.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' : pay.status === 'verifying' ? 'bg-orange-500/10 text-orange-600' : pay.status === 'failed' ? 'bg-rose-500/10 text-rose-600' : 'bg-slate-500/10 text-slate-600'}">
                                            {formatStatus(pay.status)}
                                        </span>
                                        {#if pay.status === 'verifying'}
                                            <a href="/admin/pagos/{pay.id}" class="text-[9px] font-bold text-orange-600 hover:text-orange-700 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-md border border-orange-200 dark:border-orange-800 transition-colors">
                                                Validar
                                            </a>
                                        {/if}
                                    </div>
                                </div>
                            {/each}
                        {:else}
                            <div class="text-center py-10">
                                <p class="text-[10px] text-slate-400 uppercase tracking-widest italic">Aún no se registran pagos</p>
                            </div>
                        {/if}
                    </div>
                </section>
            </aside>
        </div>
    {/if}
</div>

<GenericConfirmModal
	isOpen={isConfirmModalOpen}
	title={modalConfig?.title || ''}
	message={modalConfig?.message || ''}
	onConfirm={async () => {
		if (modalConfig) await modalConfig.onConfirm();
		isConfirmModalOpen = false;
	}}
	onClose={() => (isConfirmModalOpen = false)}
	loading={cancelling || refunding}
/>

<!-- Modal Añadir Extra -->
{#if showAddExtraModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
		<div class="bg-white dark:bg-[#11151d] w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
					⭐ Agregar Servicio Extra
				</h2>
				<button onclick={() => showAddExtraModal = false} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
				</button>
			</div>

			<div class="p-6 overflow-y-auto space-y-6">
				{#if availableExtras.length === 0}
					<p class="text-center text-sm text-slate-500 italic">No hay servicios extras disponibles en el catálogo.</p>
				{:else}
					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Servicio Extra <span class="text-red-500">*</span></label>
						<select bind:value={selectedExtraId} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500/50 outline-none transition-all">
							<option value="">-- Seleccionar --</option>
							{#each availableExtras as extra}
								<option value={extra.id}>{extra.name} - ${extra.price}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Cantidad <span class="text-red-500">*</span></label>
						<input type="number" min="1" bind:value={extraQuantity} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500/50 outline-none transition-all font-mono" />
					</div>

					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Notas / Comentarios</label>
						<textarea bind:value={extraNotes} rows="2" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-fuchsia-500/50 outline-none transition-all resize-none" placeholder="Opcional. Ej: Alergia a las nueces..."></textarea>
					</div>
				{/if}
			</div>

			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" onclick={() => showAddExtraModal = false} class="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
					Cancelar
				</button>
				<button 
					type="button" 
					onclick={handleAddExtra} 
					disabled={addingExtra || selectedExtraId === '' || extraQuantity < 1}
					class="px-5 py-2.5 bg-fuchsia-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-fuchsia-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
				>
					{#if addingExtra}
						<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					{/if}
					Agregar a Reservación
				</button>
			</div>
		</div>
	</div>
{/if}
