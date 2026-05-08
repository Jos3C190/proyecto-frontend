<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	interface Props {
		isOpen: boolean;
		onConfirm: (reason: string) => void;
		onClose: () => void;
		loading?: boolean;
	}

	let { isOpen, onConfirm, onClose, loading = false }: Props = $props();
	let reason = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!reason.trim()) return;
		onConfirm(reason.trim());
	}

	$effect(() => {
		if (isOpen) {
			reason = '';
		}
	});
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
				<div class="reject-icon">
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
						><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line
							x1="9"
							y1="9"
							x2="15"
							y2="15"
						/></svg
					>
				</div>
				<h2 class="modal-title">Rechazar Pago</h2>
				<p class="modal-subtitle">Indique el motivo por el cual se rechaza esta transacción.</p>
			</div>

			<form onsubmit={handleSubmit} class="modal-body">
				<div class="field">
					<label for="rejection-reason" class="field-label">Motivo del rechazo</label>
					<textarea
						id="rejection-reason"
						bind:value={reason}
						placeholder="Ej: Comprobante ilegible, monto incorrecto, transferencia no recibida..."
						required
						rows="4"
						class="field-input"
						disabled={loading}
					></textarea>
					<p class="field-hint">Este motivo será visible para el cliente.</p>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn-secondary" onclick={onClose} disabled={loading}>
						Cancelar
					</button>
					<button
						type="submit"
						class="btn-danger"
						disabled={loading || !reason.trim()}
					>
						{#if loading}
							<span class="spinner"></span>
							Procesando...
						{:else}
							Confirmar Rechazo
						{/if}
					</button>
				</div>
			</form>
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
		background: rgba(11, 14, 20, 0.85);
		backdrop-filter: blur(12px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1100;
		padding: 1.5rem;
	}

	.modal-content {
		background: #ffffff;
		width: 100%;
		max-width: 500px;
		border-radius: 2rem;
		overflow: hidden;
		box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html.dark) .modal-content {
		background: #0f131a;
		border-color: rgba(255, 255, 255, 0.05);
	}

	.modal-header {
		padding: 2.5rem 2.5rem 1.5rem;
		text-align: center;
	}

	.reject-icon {
		width: 64px;
		height: 64px;
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
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
		padding: 0 2.5rem 2.5rem;
	}

	.field {
		margin-bottom: 1.5rem;
	}

	.field-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #94a3b8;
		margin-bottom: 0.75rem;
	}

	.field-input {
		width: 100%;
		padding: 1rem;
		border-radius: 1rem;
		border: 2px solid #f1f5f9;
		background: #f8fafc;
		color: #1e293b;
		font-size: 0.9375rem;
		line-height: 1.6;
		resize: none;
		transition: all 0.2s;
	}

	.field-input:focus {
		outline: none;
		border-color: #ef4444;
		background: #ffffff;
		box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.05);
	}

	:global(html.dark) .field-input {
		background: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.05);
		color: #ffffff;
	}

	:global(html.dark) .field-input:focus {
		border-color: #ef4444;
		background: rgba(255, 255, 255, 0.05);
	}

	.field-hint {
		font-size: 0.75rem;
		color: #94a3b8;
		margin-top: 0.75rem;
		font-style: italic;
	}

	.modal-footer {
		display: grid;
		grid-template-cols: 1fr 1fr;
		gap: 1rem;
		margin-top: 1.5rem;
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
		border: 2px solid #f1f5f9;
		color: #64748b;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #f1f5f9;
		color: #1e293b;
	}

	:global(html.dark) .btn-secondary {
		border-color: rgba(255, 255, 255, 0.05);
		color: #94a3b8;
	}

	:global(html.dark) .btn-secondary:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.05);
		color: #ffffff;
	}

	.btn-danger {
		background: #ef4444;
		border: none;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
		transform: translateY(-1px);
		box-shadow: 0 15px 25px -5px rgba(239, 68, 68, 0.3);
	}

	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none !important;
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
