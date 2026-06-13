<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { toast } from '$lib/stores/toast.svelte';
	import GenericConfirmModal from '$lib/components/ui/GenericConfirmModal.svelte';
	import { getFromCache, saveToCache, invalidateCache } from '$lib/utils/cache';
	
	import {
		fetchAllIncidentals,
		fetchIncidentalStats,
		fetchIncidentalCategories,
		createIncidentalCategory,
		updateIncidentalCategory,
		deleteIncidentalCategory,
		waiveReservationIncidental,
		deleteReservationIncidental,
		uploadIncidentalEvidence,
		type IncidentalChargeRead,
		type IncidentalChargeCategoryRead
	} from '$lib/services/incidental_charge.service';
	
	import { fetchPublicSettings } from '$lib/services/settings.service';
	import { createPersistence } from '$lib/utils/persistence';
	import '../adminPage.css';
	import { Clock, DollarSign, ShieldCheck, Settings, Plus } from 'lucide-svelte';

	const persistence = createPersistence({
		key: 'admin_incidentals',
		defaultValues: {
			page: 1,
			pageSize: 10,
			searchQuery: '',
			selectedStatus: '',
			selectedCategory: ''
		}
	});

	const initialState = persistence.getInitialState();

	let charges = $state<IncidentalChargeRead[]>([]);
	let categories = $state<IncidentalChargeCategoryRead[]>([]);
	let ivaRate = $state(0.13);
	
	let loading = $state(true);
	let actionLoading = $state(false);
	let error = $state<string | null>(null);

	let page = $state(initialState.page);
	let pageSize = $state(initialState.pageSize);
	let searchQuery = $state(initialState.searchQuery);
	let selectedStatus = $state(initialState.selectedStatus);
	let selectedCategory = $state(initialState.selectedCategory);

	// Modals State
	let isDeleteModalOpen = $state(false);
	let chargeToDelete = $state<IncidentalChargeRead | null>(null);

	let isWaiveModalOpen = $state(false);
	let chargeToWaive = $state<IncidentalChargeRead | null>(null);
	let waiveReason = $state('');

	let showManageCategoriesModal = $state(false);
	let showAddCategoryForm = $state(false);
	let newCategoryName = $state('');
	let newCategoryDesc = $state('');
	let newCategoryIcon = $state('📦');
	let savingCategory = $state(false);

	let uploadingEvidenceId = $state<number | null>(null);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			page,
			pageSize,
			searchQuery,
			selectedStatus,
			selectedCategory
		});
	});

	let hasAccess = $derived(hasPermission($authStore.user, 'incidentals', 'read'));

	// SWR / Server-side list representation
	let filteredCharges = $derived(charges);

	// Stats/KPIs populated by server
	let pendingSum = $state(0);
	let paidSum = $state(0);
	let waivedCount = $state(0);

	// Pagination
	let paginatedCharges = $derived(charges);
	let hasNextPage = $state(false);
	let hasPrevPage = $derived(page > 1);

	function nextPage() { if (hasNextPage && !loading) void loadAll(page + 1); }
	function prevPage() { if (hasPrevPage && !loading) void loadAll(page - 1); }
	function setPageSize(e: Event) {
		const v = Number((e.currentTarget as HTMLSelectElement).value);
		if (!Number.isFinite(v) || v <= 0) return;
		pageSize = v;
		void loadAll(1);
	}

	function formatDateTime(dateStr: string) {
		if (!dateStr) return '---';
		try {
			let parsedStr = dateStr;
			if (!dateStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateStr)) {
				parsedStr = dateStr.replace(' ', 'T') + 'Z';
			}
			const date = new Date(parsedStr);
			if (isNaN(date.getTime())) return dateStr;

			const formatter = new Intl.DateTimeFormat('es-SV', {
				timeZone: 'America/El_Salvador',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});
			
			const parts = formatter.formatToParts(date);
			const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
			
			return `${partMap.day}/${partMap.month}/${partMap.year} ${partMap.hour}:${partMap.minute}`;
		} catch (e) {
			const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
			if (match) {
				const [_, y, m, d, hh, mm] = match;
				return `${d}/${m}/${y} ${hh}:${mm}`;
			}
			return dateStr;
		}
	}

	async function loadAll(targetPage?: number, forceFetch = false) {
		const currentPage = targetPage ?? page;
		const offset = (currentPage - 1) * pageSize;
		const querySearch = searchQuery.trim();
		const categoryIdNum = selectedCategory ? Number(selectedCategory) : undefined;
		
		const cacheKey = `incidentals_${pageSize}_${offset}_${querySearch}_${selectedStatus}_${selectedCategory}`;
		const statsKey = `incidentals_stats_${querySearch}_${selectedStatus}_${selectedCategory}`;

		// 1. SWR cache check
		const cachedCharges = getFromCache<IncidentalChargeRead[]>(cacheKey);
		const cachedStats = getFromCache<{ pending_sum: number; paid_sum: number; waived_count: number }>(statsKey);

		if (cachedCharges && cachedStats && !forceFetch) {
			charges = cachedCharges.slice(0, pageSize);
			hasNextPage = cachedCharges.length > pageSize;
			pendingSum = cachedStats.pending_sum;
			paidSum = cachedStats.paid_sum;
			waivedCount = cachedStats.waived_count;
			page = currentPage;
			loading = false;
			error = null;
		} else {
			loading = true;
		}

		try {
			const [chargesData, statsData, categoriesData] = await Promise.all([
				fetchAllIncidentals({
					limit: pageSize + 1,
					offset,
					search: querySearch || undefined,
					status: selectedStatus || undefined,
					category_id: categoryIdNum
				}),
				fetchIncidentalStats({
					search: querySearch || undefined,
					status: selectedStatus || undefined,
					category_id: categoryIdNum
				}),
				categories.length === 0 ? fetchIncidentalCategories() : Promise.resolve(categories)
			]);

			saveToCache(cacheKey, chargesData);
			saveToCache(statsKey, statsData);

			charges = chargesData.slice(0, pageSize);
			hasNextPage = chargesData.length > pageSize;
			pendingSum = statsData.pending_sum;
			paidSum = statsData.paid_sum;
			waivedCount = statsData.waived_count;
			categories = categoriesData;
			page = currentPage;
			error = null;
		} catch (err: any) {
			if (!cachedCharges || !cachedStats) {
				error = err.message;
				toast.error('Error al cargar cargos incidentales: ' + err.message);
			}
		} finally {
			loading = false;
		}
	}

	let debounceTimeout: any;
	function handleSearchInput() {
		page = 1;
		clearTimeout(debounceTimeout);
		debounceTimeout = setTimeout(() => {
			void loadAll(1);
		}, 300);
	}

	onMount(async () => {
		if (!hasAccess) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		try {
			const settings = await fetchPublicSettings();
			ivaRate = settings.tax_iva_rate ?? 0.13;
		} catch (err) {
			console.error('Error al cargar la tasa de IVA desde la configuración:', err);
		}
		await loadAll(page);
	});

	function openReservationDetail(resId: number) {
		goto(`/admin/reservaciones/${resId}/detalle`);
	}

	async function openWaiveModal(charge: IncidentalChargeRead) {
		chargeToWaive = charge;
		waiveReason = '';
		isWaiveModalOpen = true;
	}

	async function confirmWaive() {
		if (!chargeToWaive || waiveReason.length < 5) return;
		actionLoading = true;
		try {
			await waiveReservationIncidental(chargeToWaive.id, waiveReason);
			toast.success('Cargo incidental exonerado con éxito');
			isWaiveModalOpen = false;
			invalidateCache('incidentals_');
			await loadAll(page, true);
		} catch (e: any) {
			toast.error(e.message || 'Error al exonerar cargo');
		} finally {
			actionLoading = false;
		}
	}

	async function openDeleteModal(charge: IncidentalChargeRead) {
		chargeToDelete = charge;
		isDeleteModalOpen = true;
	}

	async function confirmDelete() {
		if (!chargeToDelete) return;
		actionLoading = true;
		try {
			await deleteReservationIncidental(chargeToDelete.id);
			toast.success('Cargo incidental eliminado con éxito');
			isDeleteModalOpen = false;
			invalidateCache('incidentals_');
			await loadAll(page, true);
		} catch (e: any) {
			toast.error(e.message || 'Error al eliminar cargo');
		} finally {
			actionLoading = false;
		}
	}

	async function handleEvidenceUpload(chargeId: number, event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			uploadingEvidenceId = chargeId;
			try {
				await uploadIncidentalEvidence(chargeId, file);
				toast.success('Evidencia fotográfica subida');
				invalidateCache('incidentals_');
				await loadAll(page, true);
			} catch (e: any) {
				toast.error('Error al subir evidencia: ' + e.message);
			} finally {
				uploadingEvidenceId = null;
			}
		}
	}

	async function handleAddCategory() {
		if (!newCategoryName.trim()) return;
		savingCategory = true;
		try {
			await createIncidentalCategory({
				name: newCategoryName.trim(),
				description: newCategoryDesc.trim() || undefined,
				icon: newCategoryIcon.trim() || undefined
			});
			toast.success('Categoría agregada exitosamente');
			newCategoryName = '';
			newCategoryDesc = '';
			newCategoryIcon = '📦';
			showAddCategoryForm = false;
			categories = await fetchIncidentalCategories();
		} catch (e: any) {
			toast.error('Error al crear categoría: ' + e.message);
		} finally {
			savingCategory = false;
		}
	}

	async function handleDeleteCategory(catId: number) {
		if (!confirm('¿Estás seguro de eliminar esta categoría? Solo se ocultará del listado.')) return;
		try {
			await deleteIncidentalCategory(catId);
			toast.success('Categoría eliminada');
			categories = await fetchIncidentalCategories();
		} catch (e: any) {
			toast.error(e.message || 'Error al eliminar categoría');
		}
	}
</script>

<svelte:head>
	<title>Admin - Cargos Incidentales</title>
</svelte:head>

{#if hasAccess}

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Cargos Incidentales</h1>
			<p class="admin-desc">Panel centralizado para registrar, exonerar, y auditar cargos incidentales (toallas rotas, daños a propiedad, late check-outs, minibar).</p>
		</div>
	</div>

	<div class="admin-toolbar flex-wrap xl:flex-nowrap gap-3">
		<div class="admin-search-wrapper w-full" style="max-width: 500px;">
			<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			<input type="text" placeholder="Buscar por reserva, descripción o staff..." bind:value={searchQuery} oninput={handleSearchInput} />
		</div>

		<div class="flex flex-wrap xl:flex-nowrap items-center gap-3">
			<div class="admin-filters !flex-nowrap">
				<select bind:value={selectedCategory} onchange={() => loadAll(1)} class="!w-[170px]">
					<option value="">Cualquier Categoría</option>
					{#each categories as cat}
						<option value={String(cat.id)}>{cat.name}</option>
					{/each}
				</select>

				<select bind:value={selectedStatus} onchange={() => loadAll(1)} class="!w-[150px]">
					<option value="">Cualquier Estado</option>
					<option value="pending">Pendiente</option>
					<option value="paid">Pagado</option>
					<option value="waived">Condonado</option>
				</select>
			</div>

			<div class="hidden xl:block w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"></div>
			
			<button type="button" class="admin-btn-secondary h-[42px] px-4" onclick={() => showManageCategoriesModal = true} title="Gestionar Categorías">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
			</button>
		</div>
	</div>

	<!-- Dashboard KPIs -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<div class="admin-kpi-card flex items-center gap-4 relative overflow-hidden">
			<div class="absolute -right-10 -bottom-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
			<div class="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
				<Clock class="w-6 h-6" />
			</div>
			<div>
				<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Incidentales Pendientes</p>
				<h3 class="text-2xl font-black text-orange-500 tracking-tighter">${pendingSum.toFixed(2)}</h3>
			</div>
		</div>

		<div class="admin-kpi-card flex items-center gap-4 relative overflow-hidden">
			<div class="absolute -right-10 -bottom-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
			<div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
				<DollarSign class="w-6 h-6" />
			</div>
			<div>
				<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recaudado</p>
				<h3 class="text-2xl font-black text-emerald-500 tracking-tighter">${paidSum.toFixed(2)}</h3>
			</div>
		</div>

		<div class="admin-kpi-card flex items-center gap-4 relative overflow-hidden">
			<div class="absolute -right-10 -bottom-10 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl"></div>
			<div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
				<ShieldCheck class="w-6 h-6" />
			</div>
			<div>
				<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cargos Exonerados</p>
				<h3 class="text-2xl font-black text-rose-500 tracking-tighter">{waivedCount}</h3>
			</div>
		</div>
	</div>

	{#if error && charges.length === 0}
		<div class="admin-error" role="alert">{error}</div>
	{/if}

	<section class="admin-section">
		{#if loading && charges.length === 0}
			<p class="admin-loading">Cargando cargos incidentales...</p>
		{:else if charges.length === 0}
			<p class="admin-hint">No hay cargos incidentales registrados en el sistema.</p>
		{:else}
			<div class="admin-table-wrapper">
				<table class="admin-table">
					<thead>
						<tr>
							<th>Reserva</th>
							<th>Concepto / Descripción</th>
							<th>Categoría</th>
							<th>Precio & Cantidad</th>
							<th>IVA</th>
							<th>Total</th>
							<th>Estado</th>
							<th>Fecha Registro</th>
							<th class="text-center">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if filteredCharges.length === 0}
							<tr>
								<td colspan="9" class="text-center py-6 text-slate-500">No se encontraron cargos para los filtros seleccionados.</td>
							</tr>
						{:else}
							{#each paginatedCharges as charge}
								<tr>
									<td class="whitespace-nowrap">
										<button class="font-black text-[#D4AF37] hover:underline" onclick={() => openReservationDetail(charge.reservation_id)}>
											{charge.reservation_unique_id || `#${charge.reservation_id}`}
										</button>
									</td>
									<td>
										<div class="flex flex-col">
											<span class="font-bold text-slate-800 dark:text-slate-200">{charge.description}</span>
											{#if charge.notes}
												<span class="text-[10px] text-slate-400 italic">Notas: "{charge.notes}"</span>
											{/if}
											{#if charge.payment_status === 'waived' && charge.waived_reason}
												<span class="text-[10px] text-rose-500 font-medium">Motivo: "{charge.waived_reason}"</span>
											{/if}
										</div>
									</td>
									<td class="whitespace-nowrap">
										<span class="text-xs">{charge.category?.name || 'Otros'}</span>
									</td>
									<td class="whitespace-nowrap font-mono text-xs">
										{charge.quantity} x ${charge.amount}
									</td>
									<td class="whitespace-nowrap text-xs">
										{#if charge.apply_tax}
											<span class="text-emerald-500 font-bold">{Math.round(ivaRate * 100)}%</span>
										{:else}
											<span class="text-slate-400">Exento</span>
										{/if}
									</td>
									<td class="whitespace-nowrap font-mono font-bold text-slate-700 dark:text-slate-300">
										${(Number(charge.total_amount) * (charge.apply_tax ? (1 + ivaRate) : 1)).toFixed(2)}
									</td>
									<td>
										<span class="admin-badge {charge.payment_status === 'paid' ? 'confirmed' : charge.payment_status === 'waived' ? 'cancelled' : 'pending'}">
											{charge.payment_status === 'paid' ? 'Pagado' : charge.payment_status === 'waived' ? 'Exonerado' : 'Pendiente'}
										</span>
									</td>
									<td class="whitespace-nowrap text-[11px] text-slate-500">
										{formatDateTime(charge.created_at)}
									</td>
									<td class="whitespace-nowrap">
										<div class="flex justify-center gap-1.5">
											{#if charge.evidence_url}
												<a href={charge.evidence_url} target="_blank" class="action-icon-btn" title="Ver foto de evidencia">
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
												</a>
											{:else if charge.payment_status === 'pending'}
												<label class="action-icon-btn cursor-pointer" title="Subir evidencia fotográfica">
													<input type="file" accept="image/*" class="hidden" onchange={(e) => handleEvidenceUpload(charge.id, e)} />
													{#if uploadingEvidenceId === charge.id}
														<div class="w-3.5 h-3.5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
													{:else}
														<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
													{/if}
												</label>
											{/if}

											{#if charge.payment_status === 'pending'}
												<button type="button" class="action-icon-btn" onclick={() => openWaiveModal(charge)} title="Exonerar / Condonar">
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 11 2 2 4-4"/></svg>
												</button>
												<button type="button" class="action-icon-btn danger" onclick={() => openDeleteModal(charge)} title="Eliminar">
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
												</button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div class="admin-pagination mt-4">
				<div class="admin-pagination-left">
					<span>Mostrando {filteredCharges.length} cargo(s)</span>
					<div class="admin-page-size">
						<label for="page-size-charges" class="text-sm">Filas:</label>
						<select id="page-size-charges" value={pageSize} onchange={setPageSize}>
							<option value="10">10</option>
							<option value="25">25</option>
							<option value="50">50</option>
						</select>
					</div>
				</div>

				<div class="admin-pagination-right">
					<button type="button" class="admin-btn-secondary" onclick={prevPage} disabled={loading || !hasPrevPage}>
						Anterior
					</button>
					<span class="admin-pagination-info">Página {page}</span>
					<button type="button" class="admin-btn-secondary" onclick={nextPage} disabled={loading || !hasNextPage}>
						Siguiente
					</button>
				</div>
			</div>
		{/if}
	</section>
</div>

<!-- Modal: Condonar Cargo -->
<GenericConfirmModal
	isOpen={isWaiveModalOpen}
	title="Exonerar Cargo Incidental"
	message="¿Confirmas que deseas condonar este cargo incidental? Se requiere ingresar un motivo justificado a continuación:"
	confirmText="Exonerar Cargo"
	variant="danger"
	onConfirm={confirmWaive}
	onClose={() => (isWaiveModalOpen = false)}
	loading={actionLoading}
>
	<div class="mt-4">
		<textarea 
			bind:value={waiveReason} 
			rows="3" 
			class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-rose-500/50 outline-none transition-all resize-none text-slate-800 dark:text-slate-200" 
			placeholder="Escribe la justificación aquí (mínimo 5 caracteres)..."
		></textarea>
	</div>
</GenericConfirmModal>

<!-- Modal: Eliminar Cargo -->
<GenericConfirmModal
	isOpen={isDeleteModalOpen}
	title="Eliminar Cargo Incidental"
	message="¿Estás seguro de eliminar de forma permanente este cargo incidental de la reservación? Esta acción es irreversible."
	confirmText="Eliminar"
	variant="danger"
	onConfirm={confirmDelete}
	onClose={() => (isDeleteModalOpen = false)}
	loading={actionLoading}
/>

<!-- Modal: Gestionar Categorías -->
{#if showManageCategoriesModal}
	<div class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
		<div class="bg-white dark:bg-[#11151d] w-full max-w-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh]">
			<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
				<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] flex items-center gap-2">
					<Settings class="w-5 h-5 text-[#D4AF37]" /> Categorías de Incidentales
				</h2>
				<button onclick={() => { showManageCategoriesModal = false; showAddCategoryForm = false; }} class="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
				</button>
			</div>

			<div class="p-6 overflow-y-auto space-y-6 flex-1">
				{#if showAddCategoryForm}
					<form onsubmit={(e) => { e.preventDefault(); handleAddCategory(); }} class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
						<h3 class="text-xs font-bold text-slate-500 uppercase tracking-widest">Nueva Categoría</h3>
						
						<div>
							<label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Nombre <span class="text-red-500">*</span></label>
							<input type="text" required bind:value={newCategoryName} class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm" placeholder="Ej. Minibar, Daños, Llaves" />
						</div>

						<div>
							<label class="block text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Descripción</label>
							<input type="text" bind:value={newCategoryDesc} class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm" placeholder="Opcional. Breve descripción..." />
						</div>

						<div class="flex items-center justify-end gap-2 pt-2">
							<button type="button" class="px-3 py-1.5 text-xs font-bold text-slate-500" onclick={() => showAddCategoryForm = false}>Cancelar</button>
							<button type="submit" disabled={savingCategory || !newCategoryName.trim()} class="px-4 py-1.5 bg-[#D4AF37] text-slate-900 rounded-xl text-xs font-bold shadow-md shadow-[#D4AF37]/10 disabled:opacity-50">
								{savingCategory ? 'Guardando...' : 'Crear'}
							</button>
						</div>
					</form>
				{:else}
					<div class="flex justify-between items-center">
						<span class="text-xs font-bold text-slate-500 uppercase tracking-widest">Catálogo Actual ({categories.length})</span>
						<button type="button" class="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold flex items-center gap-1.5" onclick={() => showAddCategoryForm = true}>
							<Plus class="w-3.5 h-3.5" /> Agregar
						</button>
					</div>
				{/if}

				<div class="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
					{#each categories as cat}
						<div class="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between group">
							<div class="flex items-center gap-3">
								<div>
									<h4 class="text-sm font-bold text-slate-800 dark:text-slate-200">{cat.name}</h4>
									{#if cat.description}
										<p class="text-[10px] text-slate-500 mt-0.5">{cat.description}</p>
									{/if}
								</div>
							</div>
							<button type="button" class="p-1 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" onclick={() => handleDeleteCategory(cat.id)} title="Eliminar categoría">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
							</button>
						</div>
					{/each}
				</div>
			</div>

			<div class="p-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end bg-gray-50/50 dark:bg-gray-900/50">
				<button type="button" onclick={() => { showManageCategoriesModal = false; showAddCategoryForm = false; }} class="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-800/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
					Aceptar
				</button>
			</div>
		</div>
	</div>
{/if}

{/if}

<style>
	.admin-search-wrapper {
		max-width: 500px !important;
		width: 100% !important;
	}
</style>
