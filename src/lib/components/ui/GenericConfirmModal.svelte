<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	interface Props {
		isOpen: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'info' | 'success';
		onConfirm: () => void;
		onClose: () => void;
		loading?: boolean;
		children?: import('svelte').Snippet;
	}

	let {
		isOpen,
		title,
		message,
		confirmText = 'Confirmar',
		cancelText = 'Cancelar',
		variant = 'info',
		onConfirm,
		onClose,
		loading = false,
		children
	}: Props = $props();

	const variants = {
		danger: {
			iconColor: 'text-rose-500',
			iconBg: 'bg-rose-500/10',
			btnClass: 'btn-danger',
			icon: 'M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10'
		},
		warning: {
			iconColor: 'text-amber-500',
			iconBg: 'bg-amber-500/10',
			btnClass: 'btn-warning',
			icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01'
		},
		success: {
			iconColor: 'text-emerald-500',
			iconBg: 'bg-emerald-500/10',
			btnClass: 'btn-success',
			icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3'
		},
		info: {
			iconColor: 'text-blue-500',
			iconBg: 'bg-blue-500/10',
			btnClass: 'btn-info',
			icon: 'M12 16h.01M12 8h.01M12 12h.01M12 20h.01M12 4h.01' // Placeholder for info icon
		}
	};

	let config = $derived(variants[variant]);
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
				<div class="variant-icon {config.iconBg} {config.iconColor}">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						{#if variant === 'info'}
							<circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line
								x1="12"
								y1="8"
								x2="12.01"
								y2="8"
							/>
						{:else}
							<path d={config.icon} />
						{/if}
					</svg>
				</div>
				<h2 class="modal-title">{title}</h2>
			</div>

			<div class="modal-body">
				<p class="modal-message">{message}</p>
				{#if children}
					{@render children()}
				{/if}
			</div>

			<div class="modal-footer">
				<button type="button" class="btn-secondary" onclick={onClose} disabled={loading}>
					{cancelText}
				</button>
				<button type="button" class="btn-base {config.btnClass}" onclick={onConfirm} disabled={loading}>
					{#if loading}
						<span class="spinner"></span>
						Procesando...
					{:else}
						{confirmText}
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
		background: rgba(11, 14, 20, 0.85);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		padding: 1.5rem;
	}

	.modal-content {
		background: #ffffff;
		width: 100%;
		max-width: 440px;
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
		padding: 2.5rem 2rem 1rem;
		text-align: center;
	}

	.variant-icon {
		width: 60px;
		height: 60px;
		border-radius: 1.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.5rem;
	}

	.modal-title {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: #1e293b;
		letter-spacing: -0.02em;
	}

	:global(html.dark) .modal-title {
		color: #ffffff;
	}

	.modal-body {
		padding: 0 2.5rem 2rem;
		text-align: center;
	}

	.modal-message {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: #64748b;
	}

	:global(html.dark) .modal-message {
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

	.btn-base {
		padding: 0.875rem 1rem;
		border-radius: 1rem;
		font-size: 0.8125rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		transition: all 0.2s;
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-secondary {
		background: transparent;
		border: 2px solid #f1f5f9;
		color: #64748b;
		padding: 0.875rem 1rem;
		border-radius: 1rem;
		font-size: 0.8125rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	:global(html.dark) .btn-secondary {
		border-color: rgba(255, 255, 255, 0.05);
		color: #94a3b8;
	}

	.btn-danger {
		background: #ef4444;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2);
	}

	.btn-warning {
		background: #f59e0b;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(245, 158, 11, 0.2);
	}

	.btn-success {
		background: #10b981;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2);
	}

	.btn-info {
		background: #3b82f6;
		color: white;
		box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.2);
	}

	.btn-base:hover:not(:disabled) {
		transform: translateY(-1px);
		filter: brightness(1.1);
	}

	.btn-base:disabled {
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
