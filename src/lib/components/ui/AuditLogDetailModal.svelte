<script lang="ts">
	import type { AuditLogRead } from '$lib/services/admin.service';
	import { X } from 'lucide-svelte';

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
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={onClose}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in animate-in fade-in zoom-in duration-200">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Detalle de Bitácora</h2>
					<p class="text-xs text-gray-500 mt-1">ID del Evento: #{log.id}</p>
				</div>
				<button onclick={onClose} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 overflow-y-auto flex-1 space-y-6">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
					<div class="flex flex-col gap-1">
						<span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Fecha y Hora</span>
						<span class="text-sm font-semibold text-slate-700 dark:text-gray-200">{formatDate(log.created_at)}</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Usuario</span>
						<span class="text-sm font-semibold text-slate-700 dark:text-gray-200">
							{#if log.user_id}
								ID #{log.user_id}
							{:else}
								<span class="text-slate-400 italic">Sistema / Anónimo</span>
							{/if}
						</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Recurso</span>
						<span class="w-fit text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">{log.resource ?? '—'}</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Acción</span>
						<span class="w-fit text-xs font-bold bg-[#D4AF37]/10 text-[#B8962A] dark:bg-[#D4AF37]/20 dark:text-[#D4AF37] px-2.5 py-1 rounded-full border border-[#D4AF37]/20 dark:border-[#D4AF37]/30">{log.action ?? '—'}</span>
					</div>
					<div class="flex flex-col gap-1 sm:col-span-2">
						<span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Ruta (Endpoint)</span>
						<span class="text-xs font-mono font-medium text-slate-600 dark:text-slate-400 bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded-xl border border-gray-150 dark:border-gray-800 break-all">{log.path ?? '—'}</span>
					</div>
				</div>

				<div class="border-t border-gray-100 dark:border-gray-800 pt-4">
					<h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Datos del Cambio (Metadata)</h3>
					<div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-150 dark:border-gray-800 overflow-x-auto max-h-64 font-mono text-xs">
						{#if metadata && typeof metadata === 'object'}
							<div class="space-y-2.5">
								{#each Object.entries(metadata) as [key, val]}
									<div class="flex flex-col sm:flex-row gap-1 sm:gap-4 pb-2 border-b border-gray-100 dark:border-gray-800 last:border-none last:pb-0">
										<span class="text-[#D4AF37] font-bold sm:w-1/3 break-all">{key}:</span>
										<span class="text-slate-700 dark:text-gray-300 sm:w-2/3 break-all">
											{#if typeof val === 'object'}
												{JSON.stringify(val, null, 2)}
											{:else}
												{val}
											{/if}
										</span>
									</div>
								{/each}
							</div>
						{:else if metadata}
							<pre class="whitespace-pre-wrap break-all text-slate-700 dark:text-gray-300">{metadata}</pre>
						{:else}
							<p class="text-gray-400 italic text-center py-4">No hay datos adicionales registrados.</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" onclick={onClose} class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-bold rounded-xl transition-colors">
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes scale-in {
		from { transform: scale(0.95); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}
	.animate-scale-in {
		animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}
</style>
