<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { getAdminAmenities, createAmenity, updateAmenity, deleteAmenity, getAdminAmenityCategories } from '$lib/services/room.service';
	import type { AmenityRead, AmenityCreate, AmenityCategoryRead } from '$lib/services/room.service';
	import AmenityCategoriesModal from '$lib/components/admin/AmenityCategoriesModal.svelte';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import AmenityIcon from '$lib/components/ui/AmenityIcon.svelte';
	import { createPersistence } from '$lib/utils/persistence';
	import { X, Save } from 'lucide-svelte';
	import '../../admin/adminPage.css';

	const persistence = createPersistence({
		key: 'admin_amenities',
		defaultValues: {
			page: 1,
			pageSize: 10,
			searchQ: '',
			selectedCategory: null as number | null
		}
	});

	const initialState = persistence.getInitialState();

	let amenities = $state<AmenityRead[]>([]);
	let allCategories = $state<AmenityCategoryRead[]>([]);
	let loading = $state(true);
	let showModal = $state(false);
	let showCategoriesModal = $state(false);
	let isDeleteModalOpen = $state(false);
	let actionLoading = $state(false);
	let editingId = $state<number | null>(null);
	let confirmDeleteId = $state<number | null>(null);

	let form = $state<AmenityCreate>({ name: '', icon: '', category_id: null });

	// Paginación y Filtros
	let page = $state(initialState.page);
	let pageSize = $state(initialState.pageSize);
	let searchQ = $state(initialState.searchQ);
	let selectedCategory = $state<number | null>(initialState.selectedCategory);

	$effect(() => {
		persistence.saveState({
			page,
			pageSize,
			searchQ,
			selectedCategory
		});
	});

	const ICON_OPTIONS = [
		'wifi', 'tv', 'phone', 'snowflake', 'thermometer', 'wine', 'bed-double', 'cloud',
		'coffee', 'car', 'sun', 'moon', 'star', 'music', 'briefcase', 'shield', 'key',
		'lock', 'unlock', 'bell', 'camera', 'video', 'mic', 'headphones', 'monitor',
		'laptop', 'tablet', 'smartphone', 'watch', 'battery-full', 'battery-empty',
		'battery-charging', 'power', 'zap', 'activity', 'heart', 'droplet', 'wind',
		'flame', 'umbrella', 'map-pin', 'navigation', 'compass', 'globe', 'anchor',
		'plane', 'train', 'truck', 'bike', 'bus', 'car-taxi-front', 'palmtree',
		'waves', 'shirt', 'sparkles', 'droplets', 'key-round', 'sunrise', 'mountain', 
		'door-open', 'trees', 'clock', 'bath'
	];

	// Filtrado y paginación
	let filteredAmenities = $derived.by(() => {
		return amenities.filter(a => {
			const mName = a.name.toLowerCase().includes(searchQ.toLowerCase());
			const mCat = selectedCategory ? a.category?.id === selectedCategory : true;
			return mName && mCat;
		});
	});

	let paginatedAmenities = $derived(filteredAmenities.slice((page - 1) * pageSize, page * pageSize));
	let totalPages = $derived(Math.ceil(filteredAmenities.length / pageSize) || 1);
	let hasNextPage = $derived(page < totalPages);
	let hasPrevPage = $derived(page > 1);

	function nextPage() { if (hasNextPage) page++; }
	function prevPage() { if (hasPrevPage) page--; }
	function setPageSize(e: Event) {
		const v = Number((e.currentTarget as HTMLSelectElement).value);
		if (!Number.isFinite(v) || v <= 0) return;
		pageSize = v;
		page = 1;
	}

	async function loadAll() {
		loading = true;
		try {
			const [amens, cats] = await Promise.all([
				getAdminAmenities(),
				getAdminAmenityCategories()
			]);
			amenities = amens;
			allCategories = cats;
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			loading = false;
		}
	}

	onMount(loadAll);

	function openCreate() {
		editingId = null;
		form = { name: '', icon: '', category_id: null };
		showModal = true;
	}

	function openEdit(a: AmenityRead) {
		editingId = a.id;
		form = { name: a.name, icon: a.icon || '', category_id: a.category?.id || null };
		showModal = true;
	}

	async function handleSave() {
		if (!form.name.trim()) {
			toast.error('El nombre es obligatorio');
			return;
		}
		try {
			if (editingId) {
				await updateAmenity(editingId, form);
				toast.success('Amenidad actualizada');
			} else {
				await createAmenity(form);
				toast.success('Amenidad creada');
			}
			showModal = false;
			await loadAll();
		} catch (e: any) {
			toast.error(e.message);
		}
	}

	function openDelete(id: number) {
		confirmDeleteId = id;
		isDeleteModalOpen = true;
	}

	async function confirmDelete() {
		if (confirmDeleteId === null) return;
		actionLoading = true;
		try {
			await deleteAmenity(confirmDeleteId);
			toast.success('Amenidad eliminada');
			isDeleteModalOpen = false;
			await loadAll();
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			actionLoading = false;
		}
	}

	// Group by category
	// Removed grouped derivation as we now use a table.
</script>

<svelte:head>
	<title>Admin - Amenidades</title>
</svelte:head>

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Catálogo de Amenidades</h1>
			<p class="admin-desc">Gestiona los servicios y complementos que ofreces en cada habitación.</p>
		</div>
		
		<div class="admin-toolbar">
			<div class="admin-search-wrapper">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				<input type="text" bind:value={searchQ} oninput={() => page = 1} placeholder="Buscar amenidad..." />
			</div>

			<div class="flex flex-wrap xl:flex-nowrap items-center gap-3">
				<div class="admin-filters !flex-nowrap">
					<select bind:value={selectedCategory} onchange={() => page = 1} class="!w-[150px]">
						<option value={null}>Todas las categorías</option>
						{#each allCategories as cat}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
					<button class="admin-btn-secondary h-[42px] px-4" onclick={() => showCategoriesModal = true} title="Gestionar Categorías">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
					</button>
				</div>

				<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
				<button class="admin-btn" onclick={openCreate}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					NUEVA
				</button>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center p-20">
			<div class="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
			<p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando catálogo...</p>
		</div>
	{:else if amenities.length === 0}
		<div class="admin-section">
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-4">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
				</div>
				<h2 class="text-xl font-['Outfit'] font-light text-slate-900 dark:text-white mb-2">Sin amenidades</h2>
				<p class="text-slate-500 text-sm">Crea tu primera amenidad para empezar a asignarlas a tus habitaciones.</p>
			</div>
		</div>
	{:else}
		<section class="admin-section">
			<div class="admin-table-wrapper">
				<table class="admin-table">
					<thead>
						<tr>
							<th>Amenidad</th>
							<th>Ícono</th>
							<th>Categoría</th>
							<th class="text-right">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if paginatedAmenities.length === 0}
							<tr>
								<td colspan="4" class="text-center py-6 text-slate-500">No se encontraron amenidades con los filtros actuales.</td>
							</tr>
						{:else}
							{#each paginatedAmenities as amenity}
								<tr>
									<td class="font-bold text-slate-800 dark:text-slate-200">
										{amenity.name}
									</td>
									<td>
										{#if amenity.icon}
											<div class="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
												<AmenityIcon name={amenity.icon} size={18} strokeWidth={2.5} />
											</div>
										{:else}
											<span class="text-slate-400 text-xs italic">N/A</span>
										{/if}
									</td>
									<td>
										{#if amenity.category}
											<span class="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
												{amenity.category.name}
											</span>
										{:else}
											<span class="text-slate-400 text-xs italic">N/A</span>
										{/if}
									</td>
									<td>
										<div class="flex justify-center gap-1">
											<button class="action-icon-btn" onclick={() => openEdit(amenity)} title="Editar">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
											</button>
											<button class="action-icon-btn danger" onclick={() => openDelete(amenity.id)} title="Eliminar">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<div class="admin-pagination">
				<div class="admin-pagination-left">
					<span>Mostrando {filteredAmenities.length} amenidad(es)</span>
					<div class="admin-page-size">
						<label for="page-size-amenities" class="text-sm">Filas:</label>
						<select id="page-size-amenities" value={pageSize} onchange={setPageSize}>
							<option value="10">10</option>
							<option value="25">25</option>
							<option value="50">50</option>
							<option value="100">100</option>
						</select>
					</div>
				</div>

				<div class="admin-pagination-right">
					<button class="admin-btn-secondary" onclick={prevPage} disabled={!hasPrevPage}>
						Anterior
					</button>
					<span class="admin-pagination-info">Página {page} de {totalPages}</span>
					<button class="admin-btn-secondary" onclick={nextPage} disabled={!hasNextPage}>
						Siguiente
					</button>
				</div>
			</div>
		</section>
	{/if}
</div>

<!-- Modal Create/Edit -->
{#if showModal}
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28">
		<!-- Backdrop -->
		<div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onclick={() => showModal = false}></div>
		
		<!-- Modal Content -->
		<div class="relative w-full max-w-xl bg-white dark:bg-[#11151d] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
			<!-- Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<div>
					<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
						{editingId ? 'Editar Amenidad' : 'Nueva Amenidad'}
					</h2>
					<p class="text-xs text-gray-500 mt-1">Configura el nombre y el ícono visual del catálogo de amenidades.</p>
				</div>
				<button onclick={() => showModal = false} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Body -->
			<div class="p-6 overflow-y-auto flex-1 space-y-5">
				<!-- Name -->
				<div class="admin-field">
					<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre <span class="text-red-500">*</span></label>
					<input type="text" bind:value={form.name} placeholder="Ej. WiFi de Alta Velocidad" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all placeholder-gray-400" required />
				</div>

				<!-- Category -->
				<div class="admin-field">
					<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Categoría</label>
					<select bind:value={form.category_id} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all">
						<option value={null}>Sin categoría</option>
						{#each allCategories as cat}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</div>

				<!-- Icon Selector -->
				<div class="admin-field">
					<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ícono <span class="text-slate-400 font-normal">(Lucide)</span></label>
					<div class="grid grid-cols-6 sm:grid-cols-8 gap-2 mt-2 max-h-48 overflow-y-auto p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
						{#each ICON_OPTIONS as icon}
							<button
								type="button"
								class="w-10 h-10 rounded-xl flex items-center justify-center transition-all {form.icon === icon ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/30 scale-110' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] border border-gray-100 dark:border-gray-700'}"
								onclick={() => form.icon = icon}
								title={icon}
							>
								<AmenityIcon name={icon} size={20} strokeWidth={2.5} />
							</button>
						{/each}
					</div>
					{#if form.icon}
						<p class="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest mt-2">Seleccionado: <strong>{form.icon}</strong></p>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" class="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors" onclick={() => showModal = false}>
					Cancelar
				</button>
				<button type="button" class="px-5 py-2.5 bg-[#D4AF37] hover:from-[#f3cd54] hover:to-[#c69a2b] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2" onclick={handleSave}>
					<Save class="w-4 h-4" />
					{editingId ? 'Guardar Cambios' : 'Crear Amenidad'}
				</button>
			</div>
		</div>
	</div>
{/if}

<AmenityCategoriesModal bind:show={showCategoriesModal} bind:categories={allCategories} />

<GenericConfirmModal
	isOpen={isDeleteModalOpen}
	title="Eliminar Amenidad"
	message="¿Estás seguro de que deseas eliminar definitivamente esta amenidad? Esta acción no se puede deshacer y se removerá de las habitaciones que la tengan asignada."
	confirmText="Eliminar"
	variant="danger"
	onConfirm={confirmDelete}
	onClose={() => (isDeleteModalOpen = false)}
	loading={actionLoading}
/>

<style>
	@keyframes scale-in {
		from { transform: scale(0.95); opacity: 0; }
		to { transform: scale(1); opacity: 1; }
	}
	.animate-scale-in {
		animation: scale-in 0.2s ease-out;
	}
</style>
