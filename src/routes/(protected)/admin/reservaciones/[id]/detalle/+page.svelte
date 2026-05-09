<script lang="ts">
	import { page as sveltePage } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { 
		getReservation, 
		updateAdminReservation,
		payAdminReservation,
		getAdminWompiLink,
		refundReservation
	} from '$lib/services/reservation.service';
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

	let hasReadAccess = $derived(hasPermission($authStore.user, 'reservations', 'read'));
	let hasUpdateAccess = $derived(hasPermission($authStore.user, 'reservations', 'update'));

	async function loadReservation() {
		loading = true;
		error = null;
		try {
			// Usamos getReservation (que debería traer los detalles completos incluyendo room y user si el backend los provee)
			// Nota: En el servicio existente getReservation usa /reservations/{id}. 
			// En un panel admin quizás queramos uno que traiga más data, pero por ahora usamos el disponible.
			reservation = await getReservation(id);
		} catch (err: any) {
			error = err.message;
			toast.error('Error al cargar reservación: ' + err.message);
		} finally {
			loading = false;
		}
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
                        <div class="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4">
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Costo Total de Estancia</span>
                            <span class="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">${reservation.total_cost}</span>
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
