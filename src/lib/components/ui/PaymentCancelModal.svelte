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
				<div class="payment-icon">
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
						><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line
							x1="1"
							y1="10"
							x2="23"
							y2="10"
						/></svg
					>
				</div>
				<h2 class="modal-title">¿Cancelar proceso de pago?</h2>
				<p class="modal-subtitle">Esta acción anulará el intento de pago actual.</p>
			</div>

			<div class="modal-body">
				<div class="info-box">
					<p class="info-text">
						Al cancelar este proceso, podrás intentar realizar el pago nuevamente utilizando
						el mismo o un método de pago diferente. No se aplicará ninguna penalización por
						esta acción.
					</p>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onClose} disabled={loading}>
					Volver
				</button>
				<button
					type="button"
					class="btn-primary"
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
		max-width: 450px;
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
		padding: 2.5rem 2rem 1.5rem;
		text-align: center;
	}

	.payment-icon {
		width: 64px;
		height: 64px;
		background: rgba(212, 175, 55, 0.1);
		color: #d4af37;
		border-radius: 1.25rem;
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
		padding: 0 2rem 2.5rem;
	}

	.info-box {
		padding: 1.25rem;
		background: #f8fafc;
		border-radius: 1rem;
		border-left: 4px solid #d4af37;
	}

	:global(html.dark) .info-box {
		background: rgba(255, 255, 255, 0.03);
	}

	.info-text {
		font-size: 0.875rem;
		line-height: 1.6;
		color: #475569;
	}

	:global(html.dark) .info-text {
		color: #94a3b8;
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

	.btn-primary {
		background: #d4af37;
		border: none;
		color: #0f172a;
		box-shadow: 0 4px 6px -1px rgba(212, 175, 55, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-primary:hover:not(:disabled) {
		background: #b8952d;
		transform: translateY(-1px);
		box-shadow: 0 10px 15px -3px rgba(212, 175, 55, 0.3);
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(0, 0, 0, 0.1);
		border-top-color: #0f172a;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
