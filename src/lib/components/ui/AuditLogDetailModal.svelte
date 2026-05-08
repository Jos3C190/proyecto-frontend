<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { AuditLogRead } from '$lib/services/admin.service';

	interface Props {
		isOpen: boolean;
		log: AuditLogRead | null;
		onClose: () => void;
	}

	let { isOpen, log, onClose }: Props = $props();

	function formatDate(iso: string): string {
		try {
			const d = new Date(iso);
			return d.toLocaleString('es-ES', {
				day: '2-digit',
				month: 'long',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return iso;
		}
	}

	function parseMetadata(json: string | null): any {
		if (!json) return null;
		try {
			return JSON.parse(json);
		} catch {
			return json;
		}
	}

	let metadata = $derived(parseMetadata(log?.metadata_json ?? null));
</script>

{#if isOpen && log}
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
				<div class="header-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline
							points="14 2 14 8 20 8"
						/><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line
							x1="10"
							y1="9"
							x2="8"
							y2="9"
						/></svg
					>
				</div>
				<div>
					<h2 class="modal-title">Detalle de Bitácora</h2>
					<p class="modal-subtitle">ID del Evento: #{log.id}</p>
				</div>
				<button class="close-btn" onclick={onClose}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg
					>
				</button>
			</div>

			<div class="modal-body">
				<div class="info-grid">
					<div class="info-item">
						<span class="label">Fecha y Hora</span>
						<span class="value">{formatDate(log.created_at)}</span>
					</div>
					<div class="info-item">
						<span class="label">Usuario</span>
						<span class="value">
							{#if log.user_id}
								ID #{log.user_id}
							{:else}
								<span class="text-slate-400 italic">Sistema / Anónimo</span>
							{/if}
						</span>
					</div>
					<div class="info-item">
						<span class="label">Recurso</span>
						<span class="value badge-blue">{log.resource ?? '—'}</span>
					</div>
					<div class="info-item">
						<span class="label">Acción</span>
						<span class="value badge-gold">{log.action ?? '—'}</span>
					</div>
					<div class="info-item full-width">
						<span class="label">Ruta (Endpoint)</span>
						<span class="value font-mono text-xs break-all">{log.path ?? '—'}</span>
					</div>
				</div>

				<div class="metadata-section">
					<h3 class="section-title">Datos del Cambio (Metadata)</h3>
					<div class="metadata-container">
						{#if metadata && typeof metadata === 'object'}
							<div class="json-tree">
								{#each Object.entries(metadata) as [key, val]}
									<div class="json-row">
										<span class="json-key">{key}:</span>
										<span class="json-value">
											{#if typeof val === 'object'}
												{JSON.stringify(val)}
											{:else}
												{val}
											{/if}
										</span>
									</div>
								{/each}
							</div>
						{:else if metadata}
							<pre class="raw-metadata">{metadata}</pre>
						{:else}
							<p class="no-metadata">No hay datos adicionales registrados.</p>
						{/if}
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn-primary" onclick={onClose}>Cerrar</button>
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
		max-width: 600px;
		max-height: 90vh;
		border-radius: 2rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.5);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	:global(html.dark) .modal-content {
		background: #0f131a;
		border-color: rgba(255, 255, 255, 0.05);
	}

	.modal-header {
		padding: 2rem;
		display: flex;
		align-items: center;
		gap: 1.25rem;
		border-bottom: 1px solid #f1f5f9;
		position: relative;
	}

	:global(html.dark) .modal-header {
		border-color: rgba(255, 255, 255, 0.05);
	}

	.header-icon {
		width: 48px;
		height: 48px;
		background: rgba(212, 175, 55, 0.1);
		color: #d4af37;
		border-radius: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-title {
		font-family: 'Outfit', sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		color: #1e293b;
		margin: 0;
	}

	:global(html.dark) .modal-title {
		color: #ffffff;
	}

	.modal-subtitle {
		font-size: 0.75rem;
		color: #64748b;
		margin: 0.25rem 0 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.close-btn {
		position: absolute;
		top: 1.5rem;
		right: 1.5rem;
		color: #94a3b8;
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.2s;
	}

	.close-btn:hover {
		color: #ef4444;
	}

	.modal-body {
		padding: 2rem;
		overflow-y: auto;
		flex: 1;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 2.5rem;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.info-item.full-width {
		grid-column: span 2;
	}

	.label {
		font-size: 0.6875rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #94a3b8;
	}

	.value {
		font-size: 0.9375rem;
		color: #334155;
		font-weight: 500;
	}

	:global(html.dark) .value {
		color: #e2e8f0;
	}

	.badge-blue {
		background: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		padding: 0.25rem 0.75rem;
		border-radius: 2rem;
		font-size: 0.8125rem;
		width: fit-content;
	}

	.badge-gold {
		background: rgba(212, 175, 55, 0.1);
		color: #d4af37;
		padding: 0.25rem 0.75rem;
		border-radius: 2rem;
		font-size: 0.8125rem;
		width: fit-content;
	}

	.metadata-section {
		background: #f8fafc;
		border-radius: 1.5rem;
		padding: 1.5rem;
	}

	:global(html.dark) .metadata-section {
		background: rgba(0, 0, 0, 0.2);
	}

	.section-title {
		font-family: 'Outfit', sans-serif;
		font-size: 0.875rem;
		font-weight: 700;
		color: #475569;
		margin: 0 0 1rem;
	}

	:global(html.dark) .section-title {
		color: #94a3b8;
	}

	.metadata-container {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	.json-tree {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.json-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
	}

	:global(html.dark) .json-row {
		border-color: rgba(255, 255, 255, 0.03);
	}

	.json-row:last-child {
		border: none;
		padding: 0;
	}

	.json-key {
		color: #d4af37;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.json-value {
		color: #334155;
		font-size: 0.8125rem;
		word-break: break-all;
	}

	:global(html.dark) .json-value {
		color: #cbd5e1;
	}

	.no-metadata {
		font-size: 0.875rem;
		color: #94a3b8;
		font-style: italic;
		text-align: center;
		margin: 1rem 0;
	}

	.modal-footer {
		padding: 1.5rem 2rem;
		background: #f8fafc;
		display: flex;
		justify-content: flex-end;
	}

	:global(html.dark) .modal-footer {
		background: rgba(0, 0, 0, 0.3);
	}

	.btn-primary {
		background: #1e293b;
		color: white;
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 1rem;
		font-size: 0.8125rem;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-primary:hover {
		background: #0f172a;
		transform: translateY(-1px);
	}

	:global(html.dark) .btn-primary {
		background: #d4af37;
		color: #000;
	}

	:global(html.dark) .btn-primary:hover {
		background: #e5c048;
	}
</style>
