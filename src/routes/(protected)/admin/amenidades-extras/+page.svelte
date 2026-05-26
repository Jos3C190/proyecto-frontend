<script lang="ts">
	import { onMount } from 'svelte';
	import {
		fetchExtraAmenities,
		createExtraAmenity,
		updateExtraAmenity,
		deleteExtraAmenity,
		uploadExtraAmenityImage,
		fetchExtraAmenityCategories,
		type ExtraAmenityRead,
		type ExtraAmenityCategoryRead
	} from '$lib/services/extra_amenity.service';
	import { toast } from '$lib/stores/toast.svelte';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import ExtraAmenityCategoriesModal from '$lib/components/admin/ExtraAmenityCategoriesModal.svelte';
	import AmenityIcon from '$lib/components/ui/AmenityIcon.svelte';
	import '../adminPage.css';
	import { Plus, Edit2, Trash2, Image as ImageIcon, Upload, X, Save, Tags, DollarSign } from 'lucide-svelte';
	
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

	let amenities = $state<ExtraAmenityRead[]>([]);
	let categories = $state<ExtraAmenityCategoryRead[]>([]);
	let loading = $state(true);

	// Filters
	let searchQ = $state('');
	let selectedCategory = $state<number | null>(null);

	let filteredAmenities = $derived.by(() => {
		return amenities.filter(a => {
			const mName = a.name.toLowerCase().includes(searchQ.toLowerCase());
			const mCat = selectedCategory ? a.category?.id === selectedCategory : true;
			return mName && mCat;
		});
	});

	// Modals
	let showAmenityModal = $state(false);
	let showCategoryModal = $state(false); // for future category management
	let isDeleteModalOpen = $state(false);
	
	// Form State
	let editingId = $state<number | null>(null);
	let formName = $state('');
	let formDescription = $state('');
	let formIcon = $state('sparkles');
	let formPrice = $state<number>(0);
	let formCategoryId = $state<number | ''>('');
	let formIsActive = $state(true);
	let selectedFile = $state<File | null>(null);
	let imagePreview = $state<string | null>(null);
	let submitting = $state(false);
	let confirmDeleteId = $state<number | null>(null);
	let actionLoading = $state(false);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		try {
			const [ams, cats] = await Promise.all([
				fetchExtraAmenities(true),
				fetchExtraAmenityCategories()
			]);
			amenities = ams;
			categories = cats;
		} catch (error: any) {
			toast.error('Error al cargar datos: ' + error.message);
		} finally {
			loading = false;
		}
	}

	function openModal(amenity?: ExtraAmenityRead) {
		if (amenity) {
			editingId = amenity.id;
			formName = amenity.name;
			formDescription = amenity.description || '';
			formIcon = amenity.icon || '';
			formPrice = amenity.price;
			formCategoryId = amenity.category?.id || '';
			formIsActive = amenity.is_active;
			imagePreview = amenity.image_url || null;
		} else {
			editingId = null;
			formName = '';
			formDescription = '';
			formIcon = 'sparkles';
			formPrice = 0;
			formCategoryId = '';
			formIsActive = true;
			imagePreview = null;
		}
		selectedFile = null;
		showAmenityModal = true;
	}

	function closeModal() {
		showAmenityModal = false;
		selectedFile = null;
		imagePreview = null;
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			selectedFile = input.files[0];
			imagePreview = URL.createObjectURL(selectedFile);
		}
	}

	async function handleSubmit() {
		if (!formName || formPrice <= 0) {
			toast.error('El nombre y el precio (mayor a 0) son obligatorios.');
			return;
		}

		submitting = true;
		try {
			const data = {
				name: formName,
				description: formDescription || undefined,
				icon: formIcon || undefined,
				price: formPrice,
				category_id: formCategoryId === '' ? undefined : formCategoryId,
				is_active: formIsActive
			};

			let savedAmenity: ExtraAmenityRead;

			if (editingId) {
				savedAmenity = await updateExtraAmenity(editingId, data);
				toast.success('Amenidad extra actualizada');
			} else {
				savedAmenity = await createExtraAmenity(data as any);
				toast.success('Amenidad extra creada');
			}

			if (selectedFile) {
				await uploadExtraAmenityImage(savedAmenity.id, selectedFile);
			}

			closeModal();
			await loadData();
		} catch (error: any) {
			toast.error('Error al guardar: ' + error.message);
		} finally {
			submitting = false;
		}
	}

	function handleDelete(id: number) {
		confirmDeleteId = id;
		isDeleteModalOpen = true;
	}

	async function confirmDelete() {
		if (confirmDeleteId === null) return;
		actionLoading = true;
		try {
			await deleteExtraAmenity(confirmDeleteId);
			toast.success('Eliminado exitosamente');
			isDeleteModalOpen = false;
			await loadData();
		} catch (error: any) {
			toast.error('Error al eliminar: ' + error.message);
		} finally {
			actionLoading = false;
		}
	}

	// Helper to display category name
	function getCategoryName(am: ExtraAmenityRead) {
		return am.category?.name || 'Sin categoría';
	}
</script>

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Amenidades Extras</h1>
			<p class="admin-desc">Gestión de servicios adicionales con costo para reservaciones.</p>
		</div>

		<div class="admin-toolbar">
			<div class="admin-search-wrapper">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
				<input type="text" bind:value={searchQ} placeholder="Buscar servicio extra..." />
			</div>

			<div class="flex flex-wrap xl:flex-nowrap items-center gap-3">
				<div class="admin-filters !flex-nowrap">
					<select bind:value={selectedCategory} class="!w-[150px]">
						<option value={null}>Todas las categorías</option>
						{#each categories as cat}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
					<button class="admin-btn-secondary h-[42px] px-4" onclick={() => showCategoryModal = true} title="Gestionar Categorías">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
					</button>
				</div>

				<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
				<button class="admin-btn" onclick={() => openModal()}>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
					NUEVA
				</button>
			</div>
		</div>
	</div>

	<div class="admin-content-grid">
		{#if loading}
			<div class="flex justify-center py-20">
				<div class="w-8 h-8 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin"></div>
			</div>
		{:else if filteredAmenities.length === 0}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-4">
					<Tags class="w-8 h-8" />
				</div>
				<h2 class="text-xl font-['Outfit'] font-bold text-slate-900 dark:text-white mb-2">Sin amenidades extras</h2>
				<p class="text-gray-500 max-w-md">No hay servicios adicionales configurados. Haz clic en "Nuevo Extra" para comenzar.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
				{#each filteredAmenities as amenity (amenity.id)}
					<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full {amenity.is_active ? '' : 'opacity-60'}">
						<!-- Image / Header -->
						<div class="h-40 bg-gray-100 dark:bg-gray-800 relative">
							{#if amenity.image_url}
								<img src={amenity.image_url} alt={amenity.name} class="w-full h-full object-cover" />
							{:else}
								<div class="w-full h-full flex items-center justify-center text-gray-400">
									<ImageIcon class="w-8 h-8 opacity-50" />
								</div>
							{/if}
							<div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
							
							<div class="absolute top-3 left-3">
								<span class="px-2 py-1 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-md border border-white/10">
									{getCategoryName(amenity)}
								</span>
							</div>

							<div class="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
								<button 
									onclick={() => openModal(amenity)}
									class="p-1.5 bg-white/10 backdrop-blur-md text-white rounded-md hover:bg-white/20 transition-colors"
									title="Editar"
								>
									<Edit2 class="w-4 h-4" />
								</button>
								<button 
									onclick={() => handleDelete(amenity.id)}
									class="p-1.5 bg-white/10 backdrop-blur-md text-red-300 hover:text-red-400 hover:bg-white/20 transition-colors"
									title="Eliminar"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>

							<div class="absolute bottom-3 left-3 right-3 flex justify-between items-end">
								<h3 class="text-white font-bold text-lg leading-tight line-clamp-1">{amenity.name}</h3>
							</div>
						</div>

						<!-- Body -->
						<div class="p-4 flex flex-col flex-1">
							<div class="flex items-center gap-2 mb-3">
								<DollarSign class="w-4 h-4 text-[#D4AF37]" />
								<span class="font-mono font-bold text-lg text-slate-900 dark:text-white">${amenity.price}</span>
							</div>
							<p class="text-xs text-gray-500 line-clamp-2 flex-1">
								{amenity.description || 'Sin descripción'}
							</p>
							
							<div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
								<span class="text-[10px] font-bold uppercase tracking-widest {amenity.is_active ? 'text-emerald-500' : 'text-gray-400'}">
									{amenity.is_active ? 'Activo' : 'Inactivo'}
								</span>
								{#if amenity.icon}
									<span class="text-xs text-gray-400 flex items-center gap-1"><Tags class="w-3 h-3"/> {amenity.icon}</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal Form -->
{#if showAmenityModal}
	<div class="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-28 bg-black/60 backdrop-blur-sm">
		<div class="bg-white dark:bg-[#11151d] w-full max-w-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh]">
			<!-- Modal Header -->
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit']">
					{editingId ? 'Editar Servicio Extra' : 'Nuevo Servicio Extra'}
				</h2>
				<button onclick={closeModal} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<X class="w-5 h-5" />
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6 overflow-y-auto flex-1">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					
					<!-- Left Col: Image -->
					<div class="space-y-4">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest">Fotografía</label>
						<div class="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-[#D4AF37]/50 transition-colors">
							<input type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange={handleFileSelect} />
							{#if imagePreview}
								<img src={imagePreview} alt="Preview" class="w-full h-full object-cover" />
								<div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
									<Upload class="w-6 h-6 text-white" />
								</div>
							{:else}
								<ImageIcon class="w-8 h-8 text-gray-300 mb-2" />
								<span class="text-xs text-gray-400 font-medium px-4 text-center">Haz clic o arrastra una imagen</span>
							{/if}
						</div>
					</div>

					<!-- Right Col: Details -->
					<div class="space-y-4">
						<div>
							<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nombre <span class="text-red-500">*</span></label>
							<input type="text" bind:value={formName} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all" placeholder="Ej: Masaje Relajante" />
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Precio ($) <span class="text-red-500">*</span></label>
								<input type="number" step="0.01" min="0" bind:value={formPrice} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all font-mono" />
							</div>
						</div>

						<div>
							<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Categoría</label>
							<select bind:value={formCategoryId} class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all">
								<option value="">-- Sin categoría --</option>
								{#each categories as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label class="flex items-center gap-2 cursor-pointer mt-2">
								<input type="checkbox" bind:checked={formIsActive} class="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]" />
								<span class="text-sm font-bold text-slate-700 dark:text-gray-300">Servicio Activo</span>
							</label>
						</div>
					</div>
					
					<!-- Full Width: Icon Selector -->
					<div class="md:col-span-2">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Ícono <span class="text-slate-400 font-normal">(Lucide)</span></label>
						<div class="grid grid-cols-8 sm:grid-cols-10 gap-2 mt-2 max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
							{#each ICON_OPTIONS as icon}
								<button
									type="button"
									class="w-10 h-10 rounded-xl flex items-center justify-center transition-all {formIcon === icon ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/30 scale-110' : 'bg-white dark:bg-gray-800 text-gray-500 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] border border-gray-100 dark:border-gray-700'}"
									onclick={() => formIcon = icon}
									title={icon}
								>
									<AmenityIcon name={icon} size={20} strokeWidth={2.5} />
								</button>
							{/each}
						</div>
						{#if formIcon}
							<p class="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest mt-2">Seleccionado: <strong>{formIcon}</strong></p>
						{/if}
					</div>

					<!-- Full Width: Description -->
					<div class="md:col-span-2">
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Descripción</label>
						<textarea bind:value={formDescription} rows="3" class="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#D4AF37]/50 outline-none transition-all resize-none" placeholder="Describe brevemente el servicio..."></textarea>
					</div>

				</div>
			</div>

			<!-- Modal Footer -->
			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" onclick={closeModal} class="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors">
					Cancelar
				</button>
				<button 
					type="button" 
					onclick={handleSubmit} 
					disabled={submitting}
					class="px-5 py-2.5 bg-[#D4AF37] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
				>
					{#if submitting}
						<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					{:else}
						<Save class="w-4 h-4" />
					{/if}
					Guardar Extra
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
</style>

<GenericConfirmModal
	isOpen={isDeleteModalOpen}
	title="Eliminar Servicio Extra"
	message="¿Estás seguro de que deseas eliminar definitivamente este servicio extra? Esta acción no se puede deshacer y dejará de estar disponible para futuras reservaciones."
	confirmText="Eliminar"
	variant="danger"
	onConfirm={confirmDelete}
	onClose={() => (isDeleteModalOpen = false)}
	loading={actionLoading}
/>

<ExtraAmenityCategoriesModal bind:show={showCategoryModal} bind:categories={categories} />
