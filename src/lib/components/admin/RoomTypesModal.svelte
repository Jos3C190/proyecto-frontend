<script lang="ts">
	import { getAdminRoomTypes, createAdminRoomType, deleteAdminRoomType } from '$lib/services/room.service';
	import type { RoomTypeRead } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';

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
	<div class="admin-modal-overlay z-[2500] flex p-4 items-center justify-center bg-black/60" role="dialog" aria-modal="true">
		<div class="admin-modal max-w-lg w-full">
			<h2 class="admin-modal-title flex justify-between items-center text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">
				Administrar Tipos
				<button type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onclick={close}>&times;</button>
			</h2>
			
			<div class="mb-5">
				<form onsubmit={handleCreateRoomType} class="flex gap-2 items-end bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
					<div class="w-full">
						<label class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block uppercase tracking-wider">Nombre</label>
						<input type="text" class="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="Ej. Presidencial" bind:value={newRoomTypeName} required />
					</div>
					<div class="w-full">
						<label class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block uppercase tracking-wider">Descripción</label>
						<input type="text" class="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 rounded-md text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500" bind:value={newRoomTypeDesc} placeholder="Opcional" />
					</div>
					<button type="submit" class="admin-btn h-[38px] px-4 whitespace-nowrap shadow-sm" disabled={savingRoomType}>+ Añadir</button>
				</form>
			</div>

			<div class="max-h-[50vh] overflow-y-auto mb-5 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
				<table class="w-full text-sm text-left">
					<thead class="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
						<tr>
							<th class="p-3 font-semibold text-slate-700 dark:text-slate-300">Tipo Registrado</th>
							<th class="p-3 font-semibold text-center w-16 text-slate-700 dark:text-slate-300">Acción</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
						{#each roomTypes as rt}
							<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
								<td class="p-3 align-middle">
									<strong class="text-slate-900 dark:text-slate-100">{rt.name}</strong>
									{#if rt.description}<span class="text-xs text-slate-500 dark:text-slate-400 ml-2 block sm:inline">{rt.description}</span>{/if}
								</td>
								<td class="p-3 text-center align-middle">
									<button type="button" class="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-md transition-colors" onclick={() => handleDeleteRoomType(rt.id)} title="Eliminar este tipo">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</td>
							</tr>
						{:else}
							<tr><td colspan="2" class="p-8 text-center text-slate-500 dark:text-slate-400">No hay tipos configurados en la base de datos</td></tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
				<button type="button" class="admin-btn-secondary px-6" onclick={close}>Cerrar Panel</button>
			</div>
		</div>
	</div>
{/if}
