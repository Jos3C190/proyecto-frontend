<script lang="ts">
	import { page as sveltePage } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { 
		createAdminReservation, 
		getAdminWompiLink, 
		payAdminReservation,
        getReservation,
		addAdminReservationExtra,
		removeAdminReservationExtra
	} from '$lib/services/reservation.service';
	import { fetchExtraAmenities, type ExtraAmenityRead } from '$lib/services/extra_amenity.service';
	import { searchRooms } from '$lib/services/room.service';
    import { fetchUsers, updateUser } from '$lib/services/admin.service';
	import FiscalDataForm from '$lib/components/ui/FiscalDataForm.svelte';
	import type { ReservationRead, AdminReservationCreate, AdminPaymentCreate } from '$lib/types/reservation';
	import type { RoomSearchResponse } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { getElSalvadorDate } from '$lib/utils/date';
	import '../../adminPage.css';

	let createStep = $state<1 | 2 | 3>(1);
	let loadingData = $state(true);
	let formLoading = $state(false);
	let formError = $state<string | null>(null);

	// Data masters
	let users = $state<any[]>([]);
	let availableExtrasList = $state<ExtraAmenityRead[]>([]);
	let addingExtra = $state(false);
	
	// Step 1 Form
	let formData = $state({
		user_id: '',
		room_id: '',
		check_in: '',
		check_out: '',
		guests: 1
	});


	// Step 2 Form (Payment)
	let paymentData = $state({
		method: 'card',
		receipt_type: 'final_consumer',
		amount: 0
	});
    let fiscalData = $state<any>(null);

	let pendingCreatedReservation = $state<ReservationRead | null>(null);
	let availableRooms = $state<RoomSearchResponse[]>([]);
	let searchPerformed = $state(false);
	let isSearching = $state(false);
	
	let userSearchTerm = $state('');
	let userDropdownOpen = $state(false);
	let selectedUserDisplay = $state('');
	let userSearchContainer: HTMLElement;

	let filteredUsers = $derived(
		users.filter(u => u.is_active && (
			u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
			(u.profile?.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
			(u.profile?.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()))
		))
	);

	const todayStr = getElSalvadorDate();

	// Estados Derivados para el Resumen
	let nightsCount = $derived.by(() => {
		if (!formData.check_in || !formData.check_out) return 0;
		const s = new Date(formData.check_in);
		const e = new Date(formData.check_out);
		const diff = e.getTime() - s.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	});

	let selectedRoomInfo = $derived(
		availableRooms.find(r => r.room.id.toString() === formData.room_id)
	);

	// Handle URL params for direct payment step
	onMount(async () => {
		if (!hasPermission($authStore.user, 'reservations', 'create')) {
			goto('/admin/reservaciones');
			return;
		}

		try {
			users = await fetchUsers();
			availableExtrasList = await fetchExtraAmenities(false);
			
			const urlResId = $sveltePage.url.searchParams.get('resId');
			const urlStep = $sveltePage.url.searchParams.get('step');
			
			if (urlResId && urlStep === '2') { // Legacy behavior, if step=2 we assume they want payment (now step 3)
				const res = await getReservation(Number(urlResId));
				pendingCreatedReservation = res;
				paymentData.amount = Number(res.balance);
				createStep = 3;
			}
		} catch (err: any) {
			toast.error('Error al inicializar formulario: ' + err.message);
		} finally {
			loadingData = false;
		}
	});

	function selectUser(u: any) {
		formData.user_id = u.id.toString();
		selectedUserDisplay = u.profile ? `${u.profile.first_name} ${u.profile.last_name} (${u.email})` : u.email;
		userDropdownOpen = false;
		userSearchTerm = '';
	}

	async function handleSearchRooms() {
		if (!formData.check_in || !formData.check_out || !formData.guests) {
			toast.error('Completa las fechas y huéspedes para buscar.');
			return;
		}
		isSearching = true;
		searchPerformed = false;
		try {
			availableRooms = await searchRooms(formData.check_in, formData.check_out, formData.guests);
			searchPerformed = true;
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			isSearching = false;
		}
	}

	async function handleCreateStep1(e: Event) {
		e.preventDefault();
		formLoading = true;
		try {
			const payload: AdminReservationCreate = {
				user_id: Number(formData.user_id),
				room_id: Number(formData.room_id),
				check_in: formData.check_in,
				check_out: formData.check_out,
				guests: Number(formData.guests)
			};
			pendingCreatedReservation = await createAdminReservation(payload);
			createStep = 2; // Move to Extras step
			toast.success('Reserva originada. Puede agregar extras.');
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			formLoading = false;
		}
	}

	async function handleAddExtra(extraId: number, quantity: number, notes?: string) {
		if (!pendingCreatedReservation) return;
		addingExtra = true;
		try {
			await addAdminReservationExtra(pendingCreatedReservation.id, extraId, quantity, notes);
			toast.success('Servicio extra agregado');
			// Refresh reservation
			pendingCreatedReservation = await getReservation(pendingCreatedReservation.id);
		} catch (e: any) {
			toast.error(e.message || 'Error al agregar extra');
		} finally {
			addingExtra = false;
		}
	}

	async function handleRemoveExtra(pivotId: number) {
		if (!pendingCreatedReservation) return;
		addingExtra = true;
		try {
			await removeAdminReservationExtra(pendingCreatedReservation.id, pivotId);
			toast.success('Servicio extra eliminado');
			// Refresh reservation
			pendingCreatedReservation = await getReservation(pendingCreatedReservation.id);
		} catch (e: any) {
			toast.error(e.message || 'Error al eliminar extra');
		} finally {
			addingExtra = false;
		}
	}

	function goToStep3() {
		if (!pendingCreatedReservation) return;
		paymentData.amount = Number(pendingCreatedReservation.balance);
		createStep = 3;
	}

	async function handleConfirmPayment(e: Event) {
		e.preventDefault();
		if (!pendingCreatedReservation) return;
		formLoading = true;
		try {
            // Si es crédito fiscal, actualizamos el cliente primero
            if (paymentData.receipt_type === 'fiscal_credit' && fiscalData && pendingCreatedReservation.user_id) {
                try {
                    await updateUser(pendingCreatedReservation.user_id, fiscalData);
                } catch (err: any) {
                    console.error("Error al actualizar datos fiscales del cliente:", err);
                }
            }

			if (paymentData.method === 'card') {
				const redirectUrl = `${window.location.origin}/admin/reservaciones/${pendingCreatedReservation.id}/detalle`;
				const url = await getAdminWompiLink(pendingCreatedReservation.id, redirectUrl);
				window.open(url, '_blank');
				toast.success('Pasarela de pago abierta en nueva pestaña');
				goto(`/admin/reservaciones/${pendingCreatedReservation.id}/detalle`);
			} else {
				const payload: AdminPaymentCreate = {
					reservation_id: pendingCreatedReservation.id,
					amount: Number(paymentData.amount),
					method: paymentData.method,
					receipt_type: paymentData.receipt_type
				};
				await payAdminReservation(pendingCreatedReservation.id, payload);
				toast.success('Pago registrado y reserva confirmada');
				goto(`/admin/reservaciones/${pendingCreatedReservation.id}/detalle`);
			}
		} catch (e: any) {
			toast.error(e.message);
		} finally {
			formLoading = false;
		}
	}

	function handleGlobalClick(e: MouseEvent) {
		if (userSearchContainer && !userSearchContainer.contains(e.target as Node)) {
			userDropdownOpen = false;
		}
	}
</script>

<svelte:window onclick={handleGlobalClick} />

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20">
    <div class="mb-10">
        <nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
            <a href="/admin/reservaciones" class="hover:text-[#D4AF37] transition-colors">Reservaciones</a>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span class="text-slate-900 dark:text-slate-200">Ingresar Nueva Reserva</span>
        </nav>

        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
                <button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-6" onclick={() => goto('/admin/reservaciones')}>
                    <div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <span class="text-xs font-black uppercase tracking-widest">Listado Global</span>
                </button>

                <h1 class="admin-title !mb-2">Nueva Reservación</h1>
                <p class="admin-desc">Configura los detalles del cliente y asigna el inventario de suites.</p>
            </div>

            <!-- Stepper Horizontal Moderno -->
            <div class="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div class="flex items-center gap-3 px-6 py-3 rounded-xl transition-all {createStep === 1 ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20 scale-105' : 'text-slate-400'}">
                    <span class="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-black">1</span>
                    <span class="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Origen</span>
                </div>
                <div class="w-4 h-px bg-slate-100 dark:bg-slate-800"></div>
                <div class="flex items-center gap-3 px-6 py-3 rounded-xl transition-all {createStep === 2 ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20 scale-105' : 'text-slate-400'}">
                    <span class="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-black">2</span>
                    <span class="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Extras</span>
                </div>
                <div class="w-4 h-px bg-slate-100 dark:bg-slate-800"></div>
                <div class="flex items-center gap-3 px-6 py-3 rounded-xl transition-all {createStep === 3 ? 'bg-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20 scale-105' : 'text-slate-400'}">
                    <span class="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-black">3</span>
                    <span class="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Pago</span>
                </div>
            </div>
        </div>
    </div>

    {#if loadingData}
        <div class="flex flex-col items-center justify-center p-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <div class="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6"></div>
            <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando datos maestros...</p>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {#if createStep === 1}
                <div class="lg:col-span-8 space-y-8">
                    <div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                        <form onsubmit={(e) => e.preventDefault()} class="space-y-8 text-left">
                            <!-- Selección de Usuario -->
                            <div class="relative" bind:this={userSearchContainer}>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cliente Titular</label>
                                {#if formData.user_id}
                                    <div class="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                                                {selectedUserDisplay.charAt(0)}
                                            </div>
                                            <div>
                                                <p class="text-sm font-bold text-emerald-700 dark:text-emerald-400">{selectedUserDisplay}</p>
                                                <p class="text-[9px] text-emerald-600/60 uppercase font-black tracking-widest leading-none mt-0.5">Cliente Seleccionado</p>
                                            </div>
                                        </div>
                                        <button type="button" class="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-all" onclick={() => { formData.user_id = ''; selectedUserDisplay = ''; }}>
                                            <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke-width="2.5"/></svg>
                                        </button>
                                    </div>
                                {:else}
                                    <div class="relative">
                                        <input type="text" placeholder="Buscar por nombre o email..." bind:value={userSearchTerm} onfocus={() => userDropdownOpen = true} class="w-full !rounded-2xl !py-4 !pl-12 !border-slate-100 dark:!border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-[#D4AF37]/10 transition-all font-medium" />
                                        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke-width="2.5"/></svg>
                                    </div>
                                    {#if userDropdownOpen}
                                        <div class="absolute z-10 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden p-2">
                                            {#each filteredUsers as u}
                                                <button type="button" class="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all border-b border-slate-50 dark:border-slate-800 last:border-0" onclick={() => selectUser(u)}>
                                                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{u.profile ? `${u.profile.first_name} ${u.profile.last_name}` : u.email}</p>
                                                    <p class="text-[10px] text-slate-400">{u.email}</p>
                                                </button>
                                            {/each}
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                            
                            <hr class="border-slate-100 dark:border-slate-800" />

                            <!-- Fechas y Buscar -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="admin-field">
                                    <label for="f-in">Llegada</label>
                                    <input id="f-in" type="date" min={todayStr} bind:value={formData.check_in} onchange={() => { searchPerformed = false; formData.room_id = ''; }} required />
                                </div>
                                <div class="admin-field">
                                    <label for="f-out">Salida</label>
                                    <input id="f-out" type="date" min={formData.check_in || todayStr} bind:value={formData.check_out} onchange={() => { searchPerformed = false; formData.room_id = ''; }} required />
                                </div>
                                <div class="admin-field">
                                    <label for="f-guests">Huéspedes</label>
                                    <input id="f-guests" type="number" min="1" bind:value={formData.guests} onchange={() => { searchPerformed = false; formData.room_id = ''; }} required />
                                </div>
                            </div>

                            <div class="flex justify-end pt-4 gap-4">
                                <button type="button" class="admin-btn-secondary px-8 !py-3 hover:!bg-rose-500/5 hover:!text-rose-500 hover:!border-rose-500/20" onclick={() => goto('/admin/reservaciones')}>Cancelar Todo</button>
                                <button type="button" class="admin-btn px-10" onclick={handleSearchRooms} disabled={isSearching || !formData.check_in || !formData.check_out}>
                                    {isSearching ? 'Consultando...' : 'Buscar Disponibilidad'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {#if searchPerformed}
                        <div class="space-y-6 fade-in">
                            <div class="flex items-center gap-4 mb-2">
                                <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Inventario Disponible</h3>
                                <div class="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                            </div>

                            {#if availableRooms.length === 0}
                                <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 p-10 rounded-[32px] text-center">
                                    <p class="text-sm text-amber-700 dark:text-amber-500 font-bold italic">No se encontraron unidades para estos criterios.</p>
                                </div>
                            {:else}
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                                    {#each availableRooms as res}
                                        {@const isSelected = formData.room_id == res.room.id.toString()}
                                        <button 
                                            type="button" 
                                            class="group relative flex flex-col overflow-hidden rounded-[28px] border-2 transition-all duration-300 text-left bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl {isSelected ? 'border-[#D4AF37] ring-4 ring-[#D4AF37]/10' : 'border-slate-100 dark:border-slate-800 hover:border-[#D4AF37]/30'}"
                                            onclick={() => formData.room_id = res.room.id.toString()}
                                        >
                                            <div class="aspect-[16/9] w-full overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                                                {#if res.room.cover_image_url}
                                                    <img src={res.room.cover_image_url} alt="Habitación {res.room.number}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                {:else}
                                                    <div class="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                                                        <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke-width="1.5"/><path d="M9 22V12h6v10" stroke-width="1.5"/></svg>
                                                        <span class="text-[10px] font-black uppercase tracking-widest">Sin imagen</span>
                                                    </div>
                                                {/if}
                                                <div class="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20">
                                                    <span class="text-white text-[11px] font-black uppercase tracking-tight">Suite {res.room.number}</span>
                                                </div>
                                                {#if isSelected}
                                                    <div class="absolute inset-0 bg-[#D4AF37]/20 backdrop-blur-[2px] flex items-center justify-center fade-in">
                                                        <div class="w-12 h-12 rounded-full bg-white text-[#D4AF37] flex items-center justify-center shadow-2xl scale-110 animate-bounce-short">
                                                            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                                        </div>
                                                    </div>
                                                {/if}
                                            </div>
                                            <div class="p-5 flex-1 flex flex-col">
                                                <div class="flex justify-between items-start mb-2">
                                                    <span class="text-[9px] font-black uppercase tracking-widest text-[#AA8222] bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded leading-none">{res.room.type}</span>
                                                    <div class="flex items-center gap-1 text-slate-400">
                                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke-width="2"/></svg>
                                                        <span class="text-[10px] font-bold">{res.room.capacity} Pax</span>
                                                    </div>
                                                </div>
                                                <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic mb-4 flex-1">
                                                    "{res.room.description || 'Hospedaje de lujo.'}"
                                                </p>
                                                <div class="flex justify-between items-end pt-4 border-t border-slate-50 dark:border-slate-800">
                                                    <div>
                                                        <div class="flex items-baseline gap-1.5 mb-0.5">
                                                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Estancia Total</p>
                                                            {#if nightsCount > 0}
                                                                <span class="text-[9px] font-black text-[#D4AF37]">·</span>
                                                                <p class="text-[9px] font-bold text-[#AA8222]">${(res.total_price / nightsCount).toFixed(2)} / noche</p>
                                                            {/if}
                                                        </div>
                                                        <p class="text-xl font-black text-slate-900 dark:text-white tracking-tight">${res.total_price}</p>
                                                    </div>
                                                    <span class="text-[9px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg">Disponible</span>
                                                </div>
                                            </div>
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Resumen Lateral Sticky -->
                <div class="lg:col-span-4 sticky top-8 space-y-6">
                    <div class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden relative">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
                        
                        <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                            <span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                            Resumen de Estancia
                        </h3>

                        <div class="space-y-6 relative">
                            <!-- Cliente -->
                            <div>
                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Cliente</label>
                                <p class="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {formData.user_id ? selectedUserDisplay : '---'}
                                </p>
                            </div>

                            <!-- Suite -->
                            <div>
                                <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unidad Seleccionada</label>
                                {#if selectedRoomInfo}
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center font-black text-[#AA8222]">
                                            {selectedRoomInfo.room.number}
                                        </div>
                                        <div>
                                            <p class="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{selectedRoomInfo.room.type}</p>
                                            <p class="text-[10px] text-slate-400 font-medium">Suite Ejecutiva</p>
                                        </div>
                                    </div>
                                {:else}
                                    <p class="text-xs font-bold text-slate-400 italic">Pendiente de selección</p>
                                {/if}
                            </div>

                            <!-- Fechas -->
                            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                <div>
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Check-in</label>
                                    <p class="text-[11px] font-bold text-slate-700 dark:text-slate-300">{formData.check_in || '--/--/--'}</p>
                                </div>
                                <div>
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Check-out</label>
                                    <p class="text-[11px] font-bold text-slate-700 dark:text-slate-300">{formData.check_out || '--/--/--'}</p>
                                </div>
                            </div>

                            <div class="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl flex justify-between items-center">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Noches</span>
                                <span class="text-sm font-black text-[#AA8222]">{nightsCount}</span>
                            </div>

                            <div class="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div class="flex justify-between items-end mb-8">
                                    <p class="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Total proyectado</p>
                                    <p class="text-3xl font-black text-[#D4AF37] tracking-tighter">
                                        ${selectedRoomInfo?.total_price || '0.00'}
                                    </p>
                                </div>

                                <button 
                                    type="button" 
                                    class="admin-btn w-full !py-4 shadow-2xl disabled:opacity-30 disabled:grayscale disabled:translate-y-0"
                                    onclick={handleCreateStep1}
                                    disabled={!formData.room_id || !formData.user_id || formLoading}
                                >
                                    {#if formLoading}
                                        <div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    {:else}
                                        Crear Reservación
                                    {/if}
                                </button>
                                <p class="text-[9px] text-center text-slate-400 mt-4 font-bold uppercase tracking-widest leading-relaxed">
                                    Al crear, se generará el folio {formData.room_id ? 'para la Suite ' + selectedRoomInfo?.room.number : ''} y podrás proceder al pago.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Tip de Gestión -->
                    <div class="p-6 bg-[#AA8222]/5 rounded-[24px] border border-[#AA8222]/10">
                        <div class="flex gap-4">
                            <svg class="w-5 h-5 text-[#AA8222] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/></svg>
                            <p class="text-[11px] text-[#AA8222] font-bold leading-relaxed italic">
                                Asegúrate de validar los datos del cliente con su identificación antes de confirmar el monto total proyectado.
                            </p>
                        </div>
                    </div>
                </div>
            {:else if createStep === 2}
                <!-- Step 2: Extras -->
                <div class="lg:col-span-8 space-y-8 fade-in">
                    <div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                        <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Servicios Extras</h2>
                        <p class="text-xs text-slate-500 mb-8">Agrega servicios adicionales a la reservación. Estos tendrán su propio costo que se sumará al folio.</p>

                        <div class="space-y-6">
                            {#if availableExtrasList.length === 0}
                                <p class="text-sm text-slate-500 italic">No hay servicios extras disponibles en el catálogo.</p>
                            {:else}
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {#each availableExtrasList as extra}
                                        <div class="p-4 rounded-[24px] border border-slate-100 dark:border-slate-800 hover:border-fuchsia-500/30 hover:bg-fuchsia-50/30 dark:hover:bg-fuchsia-900/10 transition-all group flex flex-col justify-between">
                                            <div class="flex items-start gap-4 mb-4">
                                                <div class="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                                                    {#if extra.image_url}
                                                        <img src={extra.image_url} alt={extra.name} class="w-full h-full object-cover" />
                                                    {:else}
                                                        <span>{extra.icon || '⭐'}</span>
                                                    {/if}
                                                </div>
                                                <div>
                                                    <h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{extra.name}</h4>
                                                    <p class="text-xs text-slate-500 line-clamp-2 mt-1">{extra.description || 'Sin descripción'}</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between mt-auto border-t border-slate-100 dark:border-slate-800 pt-4">
                                                <span class="text-lg font-black text-fuchsia-600 dark:text-fuchsia-400">${extra.price}</span>
                                                <button 
                                                    class="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                                                    onclick={() => handleAddExtra(extra.id, 1)}
                                                    disabled={addingExtra}
                                                >
                                                    Agregar
                                                </button>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        <!-- Lista de extras ya agregados -->
                        {#if pendingCreatedReservation?.extras && pendingCreatedReservation.extras.length > 0}
                            <div class="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
                                <h3 class="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Extras en la Reservación</h3>
                                <div class="space-y-3">
                                    {#each pendingCreatedReservation.extras as extraItem}
                                        <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <div class="flex items-center gap-3">
                                                <span class="text-lg">{extraItem.extra_amenity.icon || '⭐'}</span>
                                                <div>
                                                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{extraItem.extra_amenity.name}</p>
                                                    <p class="text-[10px] text-slate-500 font-bold uppercase">{extraItem.quantity} x ${extraItem.unit_price} = <span class="text-fuchsia-600">${extraItem.total_price}</span></p>
                                                </div>
                                            </div>
                                            <button 
                                                class="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                                onclick={() => handleRemoveExtra(extraItem.id)}
                                                disabled={addingExtra}
                                            >
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-width="2"/></svg>
                                            </button>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}

                        <div class="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <button 
                                class="admin-btn px-8 shadow-xl"
                                onclick={goToStep3}
                            >
                                Continuar al Pago
                                <svg class="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Resumen Lateral Sticky (Step 2) -->
                <div class="lg:col-span-4 sticky top-8 space-y-6 fade-in">
                    <div class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden relative">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
                        
                        <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                            <span class="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                            Folio Generado
                        </h3>

                        <div class="space-y-6 relative">
                            <!-- ID -->
                            <div class="text-center bg-slate-50 dark:bg-slate-950 p-6 rounded-[24px]">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Código de Reserva</p>
                                <p class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{pendingCreatedReservation?.unique_id}</p>
                            </div>

                            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div class="flex justify-between items-center mb-2">
                                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estancia</p>
                                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200">${pendingCreatedReservation?.total_cost}</p>
                                </div>
                                <div class="flex justify-between items-center mb-2">
                                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Extras</p>
                                    <p class="text-sm font-bold text-fuchsia-600 dark:text-fuchsia-400">${(Number(pendingCreatedReservation?.extras_total || 0) * 1.13).toFixed(2)}</p>
                                </div>
                                
                                <div class="flex justify-between items-end mt-6">
                                    <p class="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Total Global</p>
                                    <p class="text-3xl font-black text-[#D4AF37] tracking-tighter">
                                        ${Number(pendingCreatedReservation?.balance).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {:else if createStep === 3}
                <!-- Step 2: Payment (Split Layout like Step 1) -->
                <div class="lg:col-span-8 space-y-8 fade-in">
                    <div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
                        <h2 class="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Liquidación de Folio</h2>
                        <p class="text-xs text-slate-500 mb-8">Selecciona el método de pago e ingresa el monto para confirmar la garantía.</p>

                        <form class="space-y-8">
                            <!-- Monto -->
                            <div class="admin-field group">
                                <label class="group-focus-within:text-[#D4AF37] transition-colors">Monto a Pagar (USD)</label>
                                <div class="relative">
                                    <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                                    <input id="p-amt" type="number" step="0.01" bind:value={paymentData.amount} class="!rounded-[24px] !bg-slate-50 dark:!bg-slate-950 !border-transparent transition-all pl-10 py-4 font-mono font-black text-3xl text-[#D4AF37] opacity-80 cursor-not-allowed" readonly />
                                </div>
                            </div>

                            <!-- Método de Pago (Radio Cards) -->
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Método de Pago</label>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label class="cursor-pointer">
                                        <input type="radio" name="pay_method" value="card" bind:group={paymentData.method} class="peer sr-only" />
                                        <div class="p-6 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 peer-checked:border-[#D4AF37] peer-checked:bg-[#D4AF37]/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-center group">
                                            <svg class="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600 group-hover:text-[#D4AF37] peer-checked:text-[#D4AF37] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke-width="1.5"/></svg>
                                            <span class="block text-sm font-bold text-slate-700 dark:text-slate-200">Tarjeta</span>
                                            <span class="block text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Pasarela online</span>
                                        </div>
                                    </label>
                                    <label class="cursor-pointer">
                                        <input type="radio" name="pay_method" value="cash" bind:group={paymentData.method} class="peer sr-only" />
                                        <div class="p-6 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 peer-checked:border-[#D4AF37] peer-checked:bg-[#D4AF37]/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-center group">
                                            <svg class="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600 group-hover:text-[#D4AF37] peer-checked:text-[#D4AF37] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" stroke-width="1.5"/></svg>
                                            <span class="block text-sm font-bold text-slate-700 dark:text-slate-200">Efectivo</span>
                                            <span class="block text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Cobro directo</span>
                                        </div>
                                    </label>
                                    <label class="cursor-pointer">
                                        <input type="radio" name="pay_method" value="transfer" bind:group={paymentData.method} class="peer sr-only" />
                                        <div class="p-6 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 peer-checked:border-[#D4AF37] peer-checked:bg-[#D4AF37]/5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-center group">
                                            <svg class="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600 group-hover:text-[#D4AF37] peer-checked:text-[#D4AF37] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" stroke-width="1.5"/></svg>
                                            <span class="block text-sm font-bold text-slate-700 dark:text-slate-200">Transferencia</span>
                                            <span class="block text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Transfer365-SWIFT / Banco</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Comprobante -->
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Comprobante Fiscal</label>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label class="cursor-pointer group">
                                        <input type="radio" name="receipt" value="final_consumer" bind:group={paymentData.receipt_type} class="peer sr-only" />
                                        <div class="flex items-center gap-4 p-5 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-500/10 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                            <div class="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-emerald-500 peer-checked:border-[6px] flex-shrink-0 transition-all"></div>
                                            <div>
                                                <span class="block text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">Consumidor Final</span>
                                                <span class="block text-[10px] text-slate-400 mt-0.5">Nota de venta estándar, sin desglose.</span>
                                            </div>
                                        </div>
                                    </label>
                                    <label class="cursor-pointer group">
                                        <input type="radio" name="receipt" value="fiscal_credit" bind:group={paymentData.receipt_type} class="peer sr-only" />
                                        <div class="flex items-center gap-4 p-5 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-500/10 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                                            <div class="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 peer-checked:border-emerald-500 peer-checked:border-[6px] flex-shrink-0 transition-all"></div>
                                            <div>
                                                <span class="block text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">Crédito Fiscal</span>
                                                <span class="block text-[10px] text-slate-400 mt-0.5">Factura legal con desglose de IVA.</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {#if paymentData.receipt_type === 'fiscal_credit' && pendingCreatedReservation?.user}
                                <div class="mt-8">
                                    <FiscalDataForm 
                                        profile={pendingCreatedReservation.user.profile || {}} 
                                        onUpdate={(data) => fiscalData = data} 
                                    />
                                </div>
                            {/if}
                        </form>
                    </div>
                </div>

                <!-- Resumen Lateral Sticky (Step 2) -->
                <div class="lg:col-span-4 sticky top-8 space-y-6 fade-in">
                    <div class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden relative">
                        <div class="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
                        
                        <h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
                            <span class="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                            Folio Generado
                        </h3>

                        <div class="space-y-6 relative">
                            <!-- ID -->
                            <div class="text-center bg-slate-50 dark:bg-slate-950 p-6 rounded-[24px]">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Código de Reserva</p>
                                <p class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{pendingCreatedReservation?.unique_id}</p>
                            </div>

                            <!-- Fechas -->
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Check-in</label>
                                    <p class="text-[11px] font-bold text-slate-700 dark:text-slate-300">{pendingCreatedReservation?.check_in}</p>
                                </div>
                                <div>
                                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Check-out</label>
                                    <p class="text-[11px] font-bold text-slate-700 dark:text-slate-300">{pendingCreatedReservation?.check_out}</p>
                                </div>
                            </div>

                            <div class="pt-6 border-t border-slate-100 dark:border-slate-800">
                                <div class="flex justify-between items-end mb-8">
                                    <p class="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Saldo Restante</p>
                                    <p class="text-3xl font-black text-[#D4AF37] tracking-tighter">
                                        ${Number(pendingCreatedReservation?.balance).toFixed(2)}
                                    </p>
                                </div>

                                <div class="space-y-3">
                                    <button 
                                        type="button" 
                                        class="admin-btn w-full !py-4 shadow-2xl disabled:opacity-30 disabled:grayscale"
                                        onclick={handleConfirmPayment}
                                        disabled={formLoading || !paymentData.amount}
                                    >
                                        {#if formLoading}
                                            <div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        {:else}
                                            {paymentData.method === 'card' ? 'Generar Pasarela Wompi' : 'Liquidar e Ingresar'}
                                        {/if}
                                    </button>
                                    <button 
                                        type="button" 
                                        class="admin-btn-secondary w-full !py-3 hover:!bg-slate-100 dark:hover:!bg-slate-800" 
                                        onclick={() => goto('/admin/reservaciones')}
                                        disabled={formLoading}
                                    >
                                        Pausar y Terminar Después
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    {/if}
</div>
