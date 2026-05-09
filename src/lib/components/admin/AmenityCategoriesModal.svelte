<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
	import { 
		getAdminAmenityCategories, 
		createAmenityCategory, 
		updateAmenityCategory, 
		deleteAmenityCategory 
	} from '$lib/services/room.service';
	import type { AmenityCategoryRead } from '$lib/services/room.service';

	let { show = $bindable(), categories = $bindable() } = $props<{
		show: boolean;
		categories: AmenityCategoryRead[];
	}>();

	let loading = $state(false);
	let saving = $state(false);
	let editingId = $state<number | null>(null);
	let editName = $state('');
	let newName = $state('');

	async function loadCategories() {
		loading = true;
		try {
			categories = await getAdminAmenityCategories();
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
			const cat = await createAmenityCategory({ name: newName.trim() });
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
			const updated = await updateAmenityCategory(id, { name: editName.trim() });
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
		if (!confirm('¿Eliminar esta categoría? Esto no eliminará las amenidades, pero quedarán sin categoría.')) return;
		try {
			await deleteAmenityCategory(id);
			categories = categories.filter(c => c.id !== id);
			toast.success('Categoría eliminada');
		} catch (e: any) {
			toast.error(e.message || 'Error al eliminar');
		}
	}

	function startEdit(cat: AmenityCategoryRead) {
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
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={() => show = false}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-scale-in">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
				<div>
					<h3 class="text-xl font-bold font-['Outfit'] text-slate-900 dark:text-white">Categorías de Amenidades</h3>
					<p class="text-sm text-slate-500">Agrupa tus amenidades para mejor visualización.</p>
				</div>
				<button onclick={() => show = false} class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
				</button>
			</div>

			<!-- Create Form -->
			<div class="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
				<form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="flex gap-2">
					<input 
						type="text" 
						bind:value={newName} 
						placeholder="Nueva categoría..." 
						class="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all dark:text-white placeholder-slate-400"
						disabled={saving}
					/>
					<button 
						type="submit" 
						disabled={saving || !newName.trim()} 
						class="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors shrink-0"
					>
						Añadir
					</button>
				</form>
			</div>

			<!-- List -->
			<div class="p-6 overflow-y-auto">
				{#if loading}
					<div class="flex justify-center p-8">
						<div class="w-8 h-8 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
					</div>
				{:else if categories.length === 0}
					<div class="text-center p-8 text-slate-500 text-sm">
						No hay categorías registradas.
					</div>
				{:else}
					<div class="space-y-2">
						{#each categories as cat}
							<div class="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl group hover:border-amber-500/30 transition-colors">
								{#if editingId === cat.id}
									<form onsubmit={(e) => { e.preventDefault(); handleUpdate(cat.id); }} class="flex flex-1 items-center gap-2 mr-2">
										<input 
											type="text" 
											bind:value={editName} 
											class="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-amber-500 dark:text-white"
											autoFocus
										/>
										<button type="submit" class="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
										</button>
										<button type="button" onclick={cancelEdit} class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
										</button>
									</form>
								{:else}
									<span class="text-sm font-medium text-slate-700 dark:text-slate-200 pl-1">{cat.name}</span>
									<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
										<button onclick={() => startEdit(cat)} class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors" title="Editar">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
										</button>
										<button onclick={() => handleDelete(cat.id)} class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
										</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
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
