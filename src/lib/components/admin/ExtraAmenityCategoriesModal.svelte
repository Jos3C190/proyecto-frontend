<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
	import { 
		fetchExtraAmenityCategories, 
		createExtraAmenityCategory, 
		updateExtraAmenityCategory, 
		deleteExtraAmenityCategory 
	} from '$lib/services/extra_amenity.service';
	import type { ExtraAmenityCategoryRead } from '$lib/services/extra_amenity.service';
	import { X, Plus, Edit2, Trash2, Check, Save } from 'lucide-svelte';

	let { show = $bindable(), categories = $bindable() } = $props<{
		show: boolean;
		categories: ExtraAmenityCategoryRead[];
	}>();

	let loading = $state(false);
	let saving = $state(false);
	let editingId = $state<number | null>(null);
	let editName = $state('');
	let newName = $state('');

	async function loadCategories() {
		loading = true;
		try {
			categories = await fetchExtraAmenityCategories();
		} catch (e: any) {
			toast.error(e.message || 'Error al cargar categorías');
		} finally {
			loading = false;
		}
	}

	async function handleCreate() {
		if (!newName.trim()) return;
		saving = true;
		try {
			const cat = await createExtraAmenityCategory({ name: newName.trim() });
			categories = [...categories, cat];
			newName = '';
			toast.success('Categoría creada');
		} catch (e: any) {
			toast.error(e.message || 'Error al crear');
		} finally {
			saving = false;
		}
	}

	async function handleUpdate(id: number) {
		if (!editName.trim()) return;
		saving = true;
		try {
			const updated = await updateExtraAmenityCategory(id, { name: editName.trim() });
			categories = categories.map(c => c.id === id ? updated : c);
			editingId = null;
			toast.success('Categoría actualizada');
		} catch (e: any) {
			toast.error(e.message || 'Error al actualizar');
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: number) {
		if (!confirm('¿Eliminar esta categoría? Esto no eliminará los servicios extras, pero quedarán sin categoría.')) return;
		try {
			await deleteExtraAmenityCategory(id);
			categories = categories.filter(c => c.id !== id);
			toast.success('Categoría eliminada');
		} catch (e: any) {
			toast.error(e.message || 'Error al eliminar');
		}
	}

	function startEdit(cat: ExtraAmenityCategoryRead) {
		editingId = cat.id;
		editName = cat.name;
	}

	function cancelEdit() {
		editingId = null;
		editName = '';
	}

	$effect(() => {
		if (show && categories.length === 0) {
			loadCategories();
		}
	});
</script>

{#if show}
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={() => show = false}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">Categorías de Extras</h2>
					<p class="text-xs text-gray-500 mt-1">Agrupa tus servicios adicionales con costo.</p>
				</div>
				<button onclick={() => show = false} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Create Form -->
			<div class="p-6 bg-gray-50/30 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800">
				<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="flex gap-2">
					<input 
						type="text" 
						bind:value={newName} 
						placeholder="Nueva categoría (ej: Masajes, Transporte)..." 
						class="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all dark:text-white placeholder-gray-400"
						disabled={saving}
					/>
					<button 
						type="submit" 
						disabled={saving || !newName.trim()} 
						class="px-5 py-2.5 bg-[#D4AF37] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
					>
						<Plus class="w-4 h-4" />
						Añadir
					</button>
				</form>
			</div>

			<!-- List -->
			<div class="p-6 overflow-y-auto flex-1">
				{#if loading}
					<div class="flex justify-center p-8">
						<div class="w-8 h-8 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin"></div>
					</div>
				{:else if categories.length === 0}
					<div class="text-center p-8 text-gray-500 text-sm font-medium">
						No hay categorías registradas. ¡Añade una arriba!
					</div>
				{:else}
					<div class="space-y-2">
						{#each categories as cat}
							<div class="flex items-center justify-between p-3.5 bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl group hover:border-[#D4AF37]/30 transition-colors">
								{#if editingId === cat.id}
									<form onsubmit={(e) => { e.preventDefault(); handleUpdate(cat.id); }} class="flex flex-1 items-center gap-2 mr-2">
										<input 
											type="text" 
											bind:value={editName} 
											class="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#D4AF37]/50 dark:text-white"
											autoFocus
										/>
										<button type="submit" class="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors" title="Guardar">
											<Check class="w-4 h-4" />
										</button>
										<button type="button" onclick={cancelEdit} class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors" title="Cancelar">
											<X class="w-4 h-4" />
										</button>
									</form>
								{:else}
									<span class="text-sm font-bold text-slate-700 dark:text-gray-300 pl-1">{cat.name}</span>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button onclick={() => startEdit(cat)} class="p-2 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-xl transition-colors" title="Editar">
											<Edit2 class="w-4 h-4" />
										</button>
										<button onclick={() => handleDelete(cat.id)} class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors" title="Eliminar">
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" onclick={() => show = false} class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-sm font-bold rounded-xl transition-colors">
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
