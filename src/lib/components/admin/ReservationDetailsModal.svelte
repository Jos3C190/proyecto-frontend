<script lang="ts">
	import type { ReservationRead, AdminReservationUpdate } from '$lib/types/reservation';
	import { updateAdminReservation } from '$lib/services/reservation.service';
	import { toast } from '$lib/stores/toast.svelte';

	let { show = $bindable(), reservation, onPay, onCancel } = $props<{
		show: boolean;
		reservation: ReservationRead | null;
		onPay: (res: ReservationRead) => void;
		onCancel: () => Promise<void>;
	}>();

	async function handleCancel() {
		if (!reservation) return;
		if (!confirm(`¿Estás seguro de cancelar la reservación ${reservation.unique_id}?`)) return;
		try {
			await updateAdminReservation(reservation.id, { status: 'cancelled' } as AdminReservationUpdate);
			toast.success('Reservación cancelada exitosamente');
			show = false;
			await onCancel();
		} catch (e: any) {
			toast.error(e.message || 'Error al cancelar la reservación');
		}
	}

	function close() {
		show = false;
	}
</script>

{#if show && reservation}
	<div class="admin-modal-overlay flex items-center justify-center p-4" role="dialog" aria-modal="true" onclick={close} onkeydown={(e) => {if(e.key === 'Escape') close()}}>
		<div class="admin-modal !max-w-5xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()} role="document" onkeydown={() => {}}>
			<div class="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
				<div>
					<h2 class="admin-modal-title mb-0">Detalles de la Reservación</h2>
					<p class="text-xs text-slate-500 font-mono mt-1">Ref: {reservation.unique_id}</p>
				</div>
				<span class="admin-badge text-sm px-3 py-1">{reservation.status.toUpperCase()}</span>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-slate-800 dark:text-slate-200">
				
				<!-- Columna 1 -->
				<div class="space-y-4">
					<div class="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 p-5 rounded-xl shadow-sm">
						<h3 class="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
							<span class="text-blue-500 text-lg">👤</span> Datos del Cliente
						</h3>
						{#if reservation.user}
							<div class="space-y-1">
								{#if reservation.user.profile}
									<p><span class="text-slate-500 inline-block w-20">Nombre:</span> <strong class="text-slate-800 dark:text-slate-200">{reservation.user.profile.first_name} {reservation.user.profile.last_name}</strong></p>
								{/if}
								<p><span class="text-slate-500 inline-block w-20">Email:</span> <span class="font-medium">{reservation.user.email}</span></p>
								<p><span class="text-slate-500 inline-block w-20">ID Sistema:</span> #{reservation.user.id}</p>
							</div>
						{:else}
							<p><span class="text-slate-500">ID de Sistema:</span> #{reservation.user_id}</p>
							<p class="text-xs text-slate-400 italic">Información extendida no disponible</p>
						{/if}
					</div>

					<div class="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 p-5 rounded-xl shadow-sm">
						<h3 class="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
							<span class="text-indigo-500 text-lg">🛏️</span> Habitación Asignada
						</h3>
						{#if reservation.room}
							<div class="space-y-1">
								<p><span class="text-slate-500 inline-block w-24">Número:</span> <strong class="text-lg">#{reservation.room.number}</strong></p>
								<p><span class="text-slate-500 inline-block w-24">Clase:</span> {reservation.room.type}</p>
								<p><span class="text-slate-500 inline-block w-24">Capacidad:</span> {reservation.room.capacity} pax</p>
								<p><span class="text-slate-500 inline-block w-24">Tarifa Base:</span> ${reservation.room.base_price}/noche</p>
							</div>
						{:else}
							<p><span class="text-slate-500">ID Habitación:</span> #{reservation.room_id}</p>
						{/if}
					</div>
				</div>

				<!-- Columna 2 -->
				<div class="space-y-4">
					<div class="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 p-5 rounded-xl shadow-sm">
						<h3 class="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
							<span class="text-green-500 text-lg">📅</span> Estancia
						</h3>
						<div class="grid grid-cols-2 gap-4 mb-3 p-3 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
							<div>
								<p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Check-in</p>
								<p class="font-medium text-slate-800 dark:text-slate-200">{reservation.check_in}</p>
							</div>
							<div>
								<p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Check-out</p>
								<p class="font-medium text-slate-800 dark:text-slate-200">{reservation.check_out}</p>
							</div>
						</div>
						<p><span class="text-slate-500 inline-block w-24">Huéspedes:</span> <strong class="text-slate-700 dark:text-slate-300">{reservation.guests} Personas</strong></p>
					</div>

					<div class="bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-900 border border-amber-200/60 dark:border-amber-900/40 p-5 rounded-xl shadow-sm relative overflow-hidden">
						<div class="absolute -right-6 -top-6 w-24 h-24 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
						<h3 class="font-semibold text-amber-800 dark:text-amber-500 mb-3 flex items-center gap-2">
							<span class="text-amber-500 text-lg">💰</span> Resumen Financiero
						</h3>
						<div class="space-y-2">
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-600 dark:text-slate-400">Tarifa Dinámica (Temporadas)</span>
								<span class="text-slate-800 dark:text-slate-300">Incluida</span>
							</div>
							<div class="flex justify-between items-center text-sm">
								<span class="text-slate-600 dark:text-slate-400">Impuestos y Cargos</span>
								<span class="text-slate-800 dark:text-slate-300">Incluidos</span>
							</div>
							<div class="w-full h-px bg-amber-200 dark:bg-amber-800/50 my-3"></div>
							<div class="flex justify-between items-end">
								<span class="text-slate-800 dark:text-slate-200 font-medium">Costo Total:</span>
								<strong class="text-lg text-slate-800 dark:text-slate-200 leading-none">${reservation.total_cost}</strong>
							</div>
							<div class="flex justify-between items-end">
								<span class="text-slate-800 dark:text-slate-200 font-medium">Total Abonado:</span>
								<strong class="text-lg text-green-600 dark:text-green-500 leading-none">${reservation.total_paid || 0}</strong>
							</div>
							<div class="w-full h-px bg-amber-200 dark:bg-amber-800/50 my-2"></div>
							<div class="flex justify-between items-end">
								<span class="text-slate-800 dark:text-slate-200 font-bold">
									{(reservation.balance || 0) < 0 ? 'Saldo a Favor:' : 'Saldo Pendiente:'}
								</span>
								<strong class="text-2xl leading-none {(reservation.balance || 0) < 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-500'}">
									{(reservation.balance || 0) < 0 ? `$${Math.abs(reservation.balance!)}` : `$${reservation.balance || 0}`}
								</strong>
							</div>
						</div>
					</div>

					{#if reservation.payments && reservation.payments.length > 0}
					<div class="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900 border border-slate-200/60 dark:border-slate-700/60 p-5 rounded-xl shadow-sm mt-4">
						<h3 class="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
							<span class="text-emerald-500 text-lg">💳</span> Historial de Transacciones
						</h3>
						<div class="space-y-3 max-h-[250px] overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #10b981 transparent;">
							{#each reservation.payments as pay}
								<div class="p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-900 flex justify-between items-center text-sm">
									<div>
										<p class="font-bold text-green-600">${pay.amount} <span class="text-[10px] text-slate-400 font-normal ml-1">({pay.method})</span></p>
										<p class="text-[10px] text-slate-500">{new Date(pay.created_at).toLocaleString()}</p>
									</div>
									<span class="admin-badge bg-green-100 text-green-800 text-[10px]">{pay.status}</span>
								</div>
							{/each}
						</div>
					</div>
					{/if}
				</div>

			</div>
			
			<div class="mt-6 text-right">
				<p class="text-[11px] text-slate-400">Ingresada al sistema: {new Date(reservation.created_at).toLocaleString('es')}</p>
			</div>

			<div class="admin-modal-actions mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 w-full">
				{#if (reservation.balance || 0) > 0}
					<button type="button" class="admin-btn shadow bg-green-600 hover:bg-green-700 text-white border-0" onclick={() => onPay(reservation!)}>
						Procesar Pago (${reservation.balance})
					</button>
				{/if}
				{#if reservation.status !== 'cancelled' && new Date() < new Date(reservation.check_in + 'T00:00:00')}
					<button type="button" class="admin-btn text-red-600 border border-red-200 hover:bg-red-50 bg-white" onclick={handleCancel}>Cancelar Reserva</button>
				{/if}
				<button type="button" class="admin-btn-secondary px-6" onclick={close}>Cerrar</button>
			</div>
		</div>
	</div>
{/if}
