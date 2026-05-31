<script lang="ts">
	import { getAdminRoomTypes, createAdminRoomType, deleteAdminRoomType } from '$lib/services/room.service';
	import type { RoomTypeRead } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';
	import { X, Plus, Trash2 } from 'lucide-svelte';

	let { show = $bindable(), roomTypes = $bindable() } = $props<{
		show: boolean;
		roomTypes: RoomTypeRead[];
	}>();

	let newRoomTypeName = $state('');
	let newRoomTypeDesc = $state('');
	let savingRoomType = $state(false);

	async function handleCreateRoomType(e: Event) {
		e.preventDefault();
		if(!newRoomTypeName) return;
		savingRoomType = true;
		try {
			await createAdminRoomType({ name: newRoomTypeName, description: newRoomTypeDesc });
			toast.success('Tipo de habitación creado');
			roomTypes = await getAdminRoomTypes();
			newRoomTypeName = '';
			newRoomTypeDesc = '';
		} catch (err: any) {
			toast.error(err.message);
		} finally {
			savingRoomType = false;
		}
	}

	async function handleDeleteRoomType(id: number) {
		if (!confirm('¿Seguro de eliminar este tipo? Las habitaciones existentes conservarán el texto.')) return;
		try {
			await deleteAdminRoomType(id);
			toast.success('Tipo eliminado exitosamente');
			roomTypes = await getAdminRoomTypes();
		} catch(err: any) {
			toast.error(err.message);
		}
	}

	function close() {
		show = false;
	}
</script>

{#if show}
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={close}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Tipos de Habitación</h2>
					<p class="text-xs text-gray-500 mt-1">Crea y administra categorías generales de habitación.</p>
				</div>
				<button onclick={close} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Create Form -->
			<div class="p-6 bg-gray-50/30 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
				<form onsubmit={handleCreateRoomType} class="flex flex-col sm:flex-row gap-3 items-end">
					<div class="w-full sm:flex-1">
						<label class="text-[10px] font-black text-gray-400 mb-1.5 block uppercase tracking-wider">Nombre <span class="text-red-500">*</span></label>
						<input type="text" class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all placeholder-gray-400" placeholder="Ej. Presidencial" bind:value={newRoomTypeName} required />
					</div>
					<div class="w-full sm:flex-1">
						<label class="text-[10px] font-black text-gray-400 mb-1.5 block uppercase tracking-wider">Descripción</label>
						<input type="text" class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all placeholder-gray-400" bind:value={newRoomTypeDesc} placeholder="Opcional" />
					</div>
					<button type="submit" class="w-full sm:w-auto px-5 py-2.5 bg-[#D4AF37] hover:from-[#f3cd54] hover:to-[#c69a2b] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0" disabled={savingRoomType}>
						<Plus class="w-4 h-4" />
						Añadir
					</button>
				</form>
			</div>

			<!-- List -->
			<div class="p-6 overflow-y-auto flex-1">
				{#if roomTypes.length === 0}
					<div class="text-center p-8 text-gray-500 text-sm font-medium">
						No hay tipos de habitación registrados.
					</div>
				{:else}
					<div class="space-y-2">
						{#each roomTypes as rt}
							<div class="flex items-center justify-between p-3.5 bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl group hover:border-[#D4AF37]/30 transition-colors">
								<div class="pl-1">
									<strong class="text-sm font-bold text-slate-700 dark:text-gray-200">{rt.name}</strong>
									{#if rt.description}
										<span class="text-xs text-gray-500 dark:text-gray-400 ml-2 italic block sm:inline">({rt.description})</span>
									{/if}
								</div>
								<button type="button" class="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all" onclick={() => handleDeleteRoomType(rt.id)} title="Eliminar tipo">
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" onclick={close} class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-bold rounded-xl transition-colors">
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
