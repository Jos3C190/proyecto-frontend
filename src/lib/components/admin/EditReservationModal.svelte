<script lang="ts">
	import { updateAdminReservation } from '$lib/services/reservation.service';
	import type { ReservationRead, AdminReservationUpdate } from '$lib/types/reservation';
	import { toast } from '$lib/stores/toast.svelte';

	let { show = $bindable(), reservation, rooms, onSuccess } = $props<{
		show: boolean;
		reservation: ReservationRead | null;
		rooms: any[];
		onSuccess: () => Promise<void>;
	}>();

	let formLoading = $state(false);
	let formError = $state<string | null>(null);

	let editData = $state({
		status: '',
		guests: 1,
		room_id: 0,
		check_in: '',
		check_out: ''
	});

	const todayDate = new Date();
	const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

	let minCheckIn = $derived(reservation && reservation.check_in < todayStr ? reservation.check_in : todayStr);

	$effect(() => {
		if (reservation) {
			editData = {
				status: reservation.status,
				guests: reservation.guests,
				room_id: reservation.room_id,
				check_in: reservation.check_in,
				check_out: reservation.check_out
			};
		}
	});

	async function handleEdit(e: Event) {
		e.preventDefault();
		if (!reservation) return;
		formError = null;
		formLoading = true;

		try {
			const payload: AdminReservationUpdate = {
				status: editData.status,
				room_id: Number(editData.room_id),
				guests: Number(editData.guests),
				check_in: editData.check_in,
				check_out: editData.check_out
			};
			await updateAdminReservation(reservation.id, payload);
			toast.success(`Reservación actualizada`);
			show = false;
			await onSuccess();
		} catch (e: any) {
			formError = e.message || 'Error al actualizar';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	function close() {
		show = false;
	}
</script>

{#if show && reservation}
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal">
			<h2 class="admin-modal-title">Editar Reservación</h2>
			{#if formError}
				<div class="admin-error mb-4">{formError}</div>
			{/if}
			<form onsubmit={handleEdit}>
				<div class="admin-field">
					<label for="e-status">Estado</label>
					<select id="e-status" bind:value={editData.status} required>
						{#if reservation.status === 'pending'}
							<option value="pending">Pendiente (Calculado por saldo)</option>
						{:else if reservation.status === 'confirmed'}
							<option value="confirmed">Confirmada (Calculado por saldo)</option>
						{/if}
						<option value="cancelled">Cancelada (Manual)</option>
					</select>
					<p class="mt-1 text-xs text-slate-500">Pendiente / Confirmada se ajustan solos según el costo total y monto pagado al guardar.</p>
				</div>
				<div class="admin-field">
					<label for="e-room">Habitación</label>
					<select id="e-room" bind:value={editData.room_id} required>
						{#each rooms as rm}
							<option value={rm.id}>#{rm.number} - {rm.type} (Max {rm.capacity} pax)</option>
						{/each}
					</select>
				</div>
				<div class="admin-field">
					<label for="e-in">Check-in</label>
					<input id="e-in" type="date" min={minCheckIn} bind:value={editData.check_in} required />
				</div>
				<div class="admin-field">
					<label for="e-out">Check-out</label>
					<input id="e-out" type="date" min={editData.check_in || minCheckIn} bind:value={editData.check_out} required />
				</div>
				<div class="admin-field">
					<label for="e-guests">Huéspedes</label>
					<input id="e-guests" type="number" min="1" bind:value={editData.guests} required />
				</div>
				<div class="admin-modal-actions mt-6">
					<button type="button" class="admin-btn-secondary" onclick={close}>Cancelar</button>
					<button type="submit" class="admin-btn" disabled={formLoading}>
						{formLoading ? 'Guardando...' : 'Guardar Cambios'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
