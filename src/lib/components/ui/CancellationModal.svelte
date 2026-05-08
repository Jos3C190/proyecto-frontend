<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { ReservationRead } from '$lib/types/reservation';

	interface Props {
		isOpen: boolean;
		reservation: ReservationRead | null;
		onConfirm: () => void;
		onClose: () => void;
		loading?: boolean;
	}

	let { isOpen, reservation, onConfirm, onClose, loading = false }: Props = $props();

	function calculatePenalty() {
		if (!reservation) return { factor: 0, text: 'No se pudo determinar la penalización.', color: 'text-slate-400' };

		// Usar la fecha de check-in (formato YYYY-MM-DD)
		const checkInDate = new Date(reservation.check_in + 'T00:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const diffTime = checkInDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays <= 0) {
			return {
				factor: 100,
				title: 'Penalización Total',
				text: 'Se aplicará una penalización del 100% del costo total. No habrá reembolso debido a que la cancelación es el mismo día del check-in o posterior.',
				color: 'text-rose-500',
				bg: 'bg-rose-500/10'
			};
		} else if (diffDays <= 2) {
			return {
				factor: 20,
				title: 'Penalización Parcial',
				text: 'Se aplicará una penalización del 20% del costo total debido a la proximidad de su estadía (faltan menos de 72 horas).',
				color: 'text-orange-500',
				bg: 'bg-orange-500/10'
			};
		} else {
			return {
				factor: 0,
				title: 'Sin Penalización',
				text: 'Puedes cancelar tu reserva sin cargos adicionales. Se procederá con la anulación del costo total.',
				color: 'text-emerald-500',
				bg: 'bg-emerald-500/10'
			};
		}
	}

	let penalty = $derived(calculatePenalty());
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="modal-overlay"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		onclick={onClose}
	>
		<div
			class="modal-content"
			transition:scale={{ duration: 300, start: 0.95 }}
			onclick={(e) => e.stopPropagation()}
		>
			<div class="modal-header">
				<div class="warning-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
						/><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg
					>
				</div>
				<h2 class="modal-title">Confirmar Cancelación</h2>
				<p class="modal-subtitle">Estás por cancelar tu reserva en Hotel AFE</p>
			</div>

			<div class="modal-body">
				<div class="reservation-summary">
					<div class="summary-item">
						<span class="label">Reserva</span>
						<span class="value">{reservation?.unique_id}</span>
					</div>
					<div class="summary-item">
						<span class="label">Check-in</span>
						<span class="value">{reservation?.check_in}</span>
					</div>
					<div class="summary-item">
						<span class="label">Total</span>
						<span class="value">${reservation?.total_cost}</span>
					</div>
				</div>

				<div class="penalty-box {penalty.bg}">
					<h4 class="penalty-title {penalty.color}">{penalty.title}</h4>
					<p class="penalty-text">{penalty.text}</p>
					{#if penalty.factor > 0}
						<div class="penalty-amount">
							<span>Monto de penalización estimado:</span>
							<span class="amount-value"
								>${((Number(reservation?.total_cost) * penalty.factor) / 100).toFixed(2)}</span
							>
						</div>
					{/if}
				</div>

				<p class="disclaimer">
					* Si ya realizaste un pago, el equipo administrativo procesará el reembolso
					correspondiente restando la penalización en un plazo de 3-5 días hábiles.
				</p>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onClose} disabled={loading}>
					Mantener Reserva
				</button>
				<button
					type="button"
					class="btn-danger"
					onclick={onConfirm}
					disabled={loading}
				>
					{#if loading}
						<span class="spinner"></span>
						Procesando...
					{:else}
						Confirmar Cancelación
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(11, 14, 20, 0.8);
		backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1.5rem;
	}

	.modal-content {
		background: #ffffff;
		width: 100%;
		max-width: 500px;
		border-radius: 1.5rem;
		overflow: hidden;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html.dark) .modal-content {
		background: #0f131a;
		border-color: rgba(255, 255, 255, 0.05);
	}

	.modal-header {
		padding: 2rem 2rem 1.5rem;
		text-align: center;
	}

	.warning-icon {
		width: 64px;
		height: 64px;
		background: rgba(245, 158, 11, 0.1);
		color: #f59e0b;
		border-radius: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.5rem;
	}

	.modal-title {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 0.5rem;
	}

	:global(html.dark) .modal-title {
		color: #ffffff;
	}

	.modal-subtitle {
		font-size: 0.875rem;
		color: #64748b;
	}

	.modal-body {
		padding: 0 2rem 2rem;
	}

	.reservation-summary {
		display: grid;
		grid-template-cols: repeat(3, 1fr);
		gap: 1rem;
		padding: 1rem;
		background: #f8fafc;
		border-radius: 1rem;
		margin-bottom: 1.5rem;
	}

	:global(html.dark) .reservation-summary {
		background: rgba(255, 255, 255, 0.03);
	}

	.summary-item {
		display: flex;
		flex-col: column;
		text-align: center;
	}

	.summary-item .label {
		display: block;
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
		font-weight: 700;
		margin-bottom: 0.25rem;
	}

	.summary-item .value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #334155;
	}

	:global(html.dark) .summary-item .value {
		color: #cbd5e1;
	}

	.penalty-box {
		padding: 1.25rem;
		border-radius: 1rem;
		margin-bottom: 1rem;
	}

	.penalty-title {
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.025em;
		margin-bottom: 0.5rem;
	}

	.penalty-text {
		font-size: 0.875rem;
		line-height: 1.5;
		color: #475569;
		margin-bottom: 1rem;
	}

	:global(html.dark) .penalty-text {
		color: #94a3b8;
	}

	.penalty-amount {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 0.75rem;
		border-top: 1px solid rgba(0, 0, 0, 0.05);
		font-size: 0.875rem;
		font-weight: 500;
	}

	:global(html.dark) .penalty-amount {
		border-top-color: rgba(255, 255, 255, 0.05);
	}

	.amount-value {
		font-size: 1rem;
		font-weight: 700;
		color: #1e293b;
	}

	:global(html.dark) .amount-value {
		color: #ffffff;
	}

	.disclaimer {
		font-size: 0.75rem;
		color: #94a3b8;
		font-style: italic;
		line-height: 1.4;
	}

	.modal-footer {
		padding: 1.5rem 2rem 2rem;
		display: grid;
		grid-template-cols: 1fr 1fr;
		gap: 1rem;
		background: #f8fafc;
	}

	:global(html.dark) .modal-footer {
		background: rgba(0, 0, 0, 0.2);
	}

	button {
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all 0.2s;
		cursor: pointer;
	}

	.btn-secondary {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		color: #64748b;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f1f5f9;
		color: #334155;
	}

	:global(html.dark) .btn-secondary {
		background: #1e293b;
		border-color: #334155;
		color: #94a3b8;
	}

	.btn-danger {
		background: #ef4444;
		border: none;
		color: white;
		box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
		transform: translateY(-1px);
		box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
