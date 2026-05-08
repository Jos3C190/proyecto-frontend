<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	interface Props {
		isOpen: boolean;
		onConfirm: () => void;
		onClose: () => void;
		loading?: boolean;
	}

	let { isOpen, onConfirm, onClose, loading = false }: Props = $props();
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
				<div class="approve-icon">
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
						><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
							points="22 4 12 14.01 9 11.01"
						/></svg
					>
				</div>
				<h2 class="modal-title">Aprobar Pago</h2>
				<p class="modal-subtitle">Confirme que los fondos han sido recibidos correctamente.</p>
			</div>

			<div class="modal-body">
				<div class="info-box">
					<p class="info-text">
						Al aprobar esta transacción, el sistema marcará el pago como completado. Si este
						pago cubre el saldo total, la reserva pasará automáticamente a estado
						<strong>Confirmada</strong>.
					</p>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onClose} disabled={loading}>
					Cancelar
				</button>
				<button
					type="button"
					class="btn-success"
					onclick={onConfirm}
					disabled={loading}
				>
					{#if loading}
						<span class="spinner"></span>
						Procesando...
					{:else}
						Confirmar Aprobación
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
		z-index: 1100;
		padding: 1.5rem;
	}

	.modal-content {
		background: #ffffff;
		width: 100%;
		max-width: 450px;
		border-radius: 2rem;
		overflow: hidden;
		box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html.dark) .modal-content {
		background: #0f131a;
		border-color: rgba(255, 255, 255, 0.05);
	}

	.modal-header {
		padding: 2.5rem 2rem 1.5rem;
		text-align: center;
	}

	.approve-icon {
		width: 64px;
		height: 64px;
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
		border-radius: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.5rem;
	}

	.modal-title {
		font-family: 'Outfit', sans-serif;
		font-size: 1.75rem;
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 0.5rem;
		letter-spacing: -0.02em;
	}

	:global(html.dark) .modal-title {
		color: #ffffff;
	}

	.modal-subtitle {
		font-size: 0.9375rem;
		color: #64748b;
	}

	.modal-body {
		padding: 0 2rem 2.5rem;
	}

	.info-box {
		padding: 1.25rem;
		background: #f0fdf4;
		border-radius: 1rem;
		border-left: 4px solid #10b981;
	}

	:global(html.dark) .info-box {
		background: rgba(16, 185, 129, 0.05);
	}

	.info-text {
		font-size: 0.875rem;
		line-height: 1.6;
		color: #065f46;
	}

	:global(html.dark) .info-text {
		color: #a7f3d0;
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
		padding: 0.875rem 1rem;
		border-radius: 1rem;
		font-size: 0.875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all 0.2s;
		cursor: pointer;
	}

	.btn-secondary {
		background: transparent;
		border: 1px solid #e2e8f0;
		color: #64748b;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f1f5f9;
		color: #1e293b;
	}

	:global(html.dark) .btn-secondary {
		background: #1e293b;
		border-color: #334155;
		color: #94a3b8;
	}

	.btn-success {
		background: #10b981;
		border: none;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-success:hover:not(:disabled) {
		background: #059669;
		transform: translateY(-1px);
		box-shadow: 0 15px 25px -5px rgba(16, 185, 129, 0.3);
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
