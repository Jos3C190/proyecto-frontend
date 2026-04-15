<script lang="ts">
	import { 
		createAdminReservation, 
		getAdminWompiLink, 
		payAdminReservation 
	} from '$lib/services/reservation.service';
	import { searchRooms } from '$lib/services/room.service';
	import type { ReservationRead, AdminReservationCreate, AdminPaymentCreate } from '$lib/types/reservation';
	import type { RoomSearchResponse } from '$lib/types/room';
	import { toast } from '$lib/stores/toast.svelte';

	let { 
		show = $bindable(), 
		users, 
		rooms, 
		onSuccess,
		initialStep = 1,
		initialReservation = null
	} = $props<{
		show: boolean;
		users: any[];
		rooms: any[];
		onSuccess: () => Promise<void>;
		initialStep?: 1 | 2;
		initialReservation?: ReservationRead | null;
	}>();

	let createStep = $state<1 | 2>(1);
	let formLoading = $state(false);
	let formError = $state<string | null>(null);

	let formData = $state({
		user_id: '',
		room_id: '',
		check_in: '',
		check_out: '',
		guests: 1
	});

	let paymentData = $state({
		method: 'card',
		receipt_type: 'final_consumer',
		amount: 0
	});

	let pendingCreatedReservation = $state<ReservationRead | null>(null);
	let wasOpened = false;
	
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

	function selectUser(u: any) {
		formData.user_id = u.id.toString();
		selectedUserDisplay = u.profile ? `${u.profile.first_name} ${u.profile.last_name} (${u.email})` : u.email;
		userDropdownOpen = false;
		userSearchTerm = '';
	}
	
	function handleGlobalClick(e: MouseEvent) {
		if (userSearchContainer && !userSearchContainer.contains(e.target as Node)) {
			userDropdownOpen = false;
		}
	}

	const todayDate = new Date();
	const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

	$effect(() => {
		if (show) {
			if (!wasOpened) {
				// Initial open reset
				createStep = initialStep;
				pendingCreatedReservation = initialReservation;
				if (initialReservation) {
					paymentData.amount = initialReservation.balance !== undefined ? Number(initialReservation.balance) : Number(initialReservation.total_cost);
				} else {
					formData = { user_id: '', room_id: '', check_in: '', check_out: '', guests: 1 };
					paymentData = { method: 'card', receipt_type: 'final_consumer', amount: 0 };
					searchPerformed = false;
					availableRooms = [];
					userSearchTerm = '';
					selectedUserDisplay = '';
				}
				formError = null;
				wasOpened = true;
			}
		} else {
			wasOpened = false;
		}
	});

	async function handleSearchRooms() {
		if (!formData.check_in || !formData.check_out || !formData.guests) {
			toast.error('Datos incompletos para buscar disponibilidad.');
			return;
		}
		const inDate = new Date(formData.check_in);
		const outDate = new Date(formData.check_out);
		if (inDate >= outDate) {
			toast.error('El Check-out debe ser posterior al Check-in.');
			return;
		}
		
		isSearching = true;
		formError = null;
		formData.room_id = ''; // reset selection
		try {
			availableRooms = await searchRooms(formData.check_in, formData.check_out, formData.guests);
			searchPerformed = true;
			if (availableRooms.length === 0) {
				toast.info('No hay habitaciones disponibles para estas fechas.');
			}
		} catch (e: any) {
			toast.error(e.message || 'Error al buscar disponibilidad');
			formError = e.message;
		} finally {
			isSearching = false;
		}
	}
	
	function onSearchParamChange() {
		searchPerformed = false;
		availableRooms = [];
		formData.room_id = '';
	}

	async function handleCreateStep1(e: Event) {
		e.preventDefault();
		formError = null;
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
			paymentData.amount = pendingCreatedReservation.balance !== undefined ? Number(pendingCreatedReservation.balance) : Number(pendingCreatedReservation.total_cost);
			toast.success('Paso 1: Reservación originada (Pendiente)');
			createStep = 2;
		} catch (e: any) {
			formError = e.message || 'Error al crear la reservación';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	async function handleCreateStep2(e: Event) {
		e.preventDefault();
		if (!pendingCreatedReservation) return;
		formError = null;
		formLoading = true;

		try {
			if (paymentData.method === 'card') {
				toast.info('Generando enlace de pago Wompi...');
				const redirectUrl = `${window.location.origin}/admin/reservaciones`;
				const url = await getAdminWompiLink(pendingCreatedReservation.id, redirectUrl);
				
				toast.success('Abriendo pasarela de pago...');
				window.open(url, '_blank');
				
				show = false;
				setTimeout(() => onSuccess(), 2000);
			} else {
				const payload: AdminPaymentCreate = {
					reservation_id: pendingCreatedReservation.id,
					amount: Number(paymentData.amount),
					method: paymentData.method,
					receipt_type: paymentData.receipt_type
				};
				await payAdminReservation(pendingCreatedReservation.id, payload);
				toast.success('Paso 2: Pago administrativo registrado y reserva confirmada');
				show = false;
				await onSuccess();
			}
		} catch (e: any) {
			formError = e.message || 'Error al procesar el pago';
			toast.error(formError);
		} finally {
			formLoading = false;
		}
	}

	function close() {
		show = false;
	}
</script>

<svelte:window onclick={handleGlobalClick} />

{#if show}
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal max-w-lg">
			<h2 class="admin-modal-title">
				{#if initialReservation}
					Completar Saldo / Pagar Reserva
				{:else}
					Crear Reservación (Paso {createStep} de 2)
				{/if}
			</h2>
			{#if formError}
				<div class="admin-error mb-4">{formError}</div>
			{/if}

			{#if createStep === 1}
				<form onsubmit={handleCreateStep1}>
					<!-- User Selection -->
					<div class="admin-field mb-4 relative" bind:this={userSearchContainer}>
						<label for="c-user-search">Usuario Titular</label>
						{#if formData.user_id}
							<div class="flex items-center justify-between border border-[#D4AF37] bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 px-3 py-2.5 rounded-lg w-full mt-1">
								<span class="text-sm font-medium text-slate-800 dark:text-slate-200">{selectedUserDisplay}</span>
								<button type="button" class="text-slate-400 hover:text-red-500 transition-colors" onclick={() => { formData.user_id = ''; selectedUserDisplay = ''; userSearchTerm = ''; }} title="Cambiar usuario">
									<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
								</button>
							</div>
						{:else}
							<input 
								id="c-user-search" 
								type="text"
								placeholder="Escribe el nombre o correo del cliente..." 
								bind:value={userSearchTerm} 
								onfocus={() => userDropdownOpen = true}
								oninput={() => userDropdownOpen = true}
								class="w-full mt-1"
								autocomplete="off"
							/>
							{#if userDropdownOpen}
								<div class="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
									{#if filteredUsers.length === 0}
										<div class="p-4 text-sm text-slate-500 text-center font-medium">No se encontraron clientes coincidentes.</div>
									{:else}
										{#each filteredUsers as u}
											<button 
												type="button" 
												class="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors"
												onclick={() => selectUser(u)}
											>
												<div class="font-bold text-slate-800 dark:text-slate-200 text-sm">
													{u.profile ? `${u.profile.first_name} ${u.profile.last_name}` : 'Sin nombre establecido'}
												</div>
												<div class="text-xs text-slate-500 font-mono mt-0.5">{u.email} <span class="opacity-50">| ID: {u.id}</span></div>
											</button>
										{/each}
									{/if}
								</div>
							{/if}
						{/if}
					</div>

					<!-- Search Container -->
					<div class="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg mb-6 shadow-sm">
						<h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wider">1. Fechas y Disponibilidad</h3>
						<div class="grid grid-cols-2 lg:grid-cols-3 gap-4 items-end">
							<div class="admin-field mb-0">
								<label for="c-in">Check-in</label>
								<input id="c-in" type="date" min={todayStr} bind:value={formData.check_in} onchange={onSearchParamChange} required />
							</div>
							<div class="admin-field mb-0">
								<label for="c-out">Check-out</label>
								<input id="c-out" type="date" min={formData.check_in || todayStr} bind:value={formData.check_out} onchange={onSearchParamChange} required />
							</div>
							<div class="admin-field mb-0">
								<label for="c-guests">Huéspedes</label>
								<input id="c-guests" type="number" min="1" bind:value={formData.guests} onchange={onSearchParamChange} required />
							</div>
						</div>
						<div class="mt-4 flex justify-end">
							<button type="button" class="admin-btn-secondary" onclick={handleSearchRooms} disabled={isSearching || !formData.check_in || !formData.check_out || !formData.guests}>
								{isSearching ? 'Buscando...' : 'Buscar Habitaciones Libres'}
							</button>
						</div>
					</div>

					<!-- Selection Container (Only if searched) -->
					{#if searchPerformed}
						<div class="p-4 border-2 border-[#D4AF37]/30 bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 rounded-lg mb-6 fade-in">
							<h3 class="text-sm font-bold text-[#b8962a] dark:text-[#D4AF37] mb-3 uppercase tracking-wider">2. Elegir Habitación</h3>
							{#if availableRooms.length === 0}
								<p class="text-sm text-slate-600 dark:text-slate-400 font-medium">⚠️ No encontramos ninguna habitación disponible con esas características. Prueba cambiando las fechas o dividiendo a los huéspedes.</p>
							{:else}
								<div class="admin-field mb-0">
									<label for="c-room">Resultados de Búsqueda ({availableRooms.length})</label>
									<select id="c-room" bind:value={formData.room_id} required>
										<option value="">-- Selecciona una habitación --</option>
										{#each availableRooms as res}
											<option value={res.room.id}>Hab #{res.room.number} ({res.room.type}) - Para {res.room.capacity} pax - Costo Total: ${res.total_price}</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>
					{/if}

					<div class="admin-modal-actions mt-6">
						<button type="button" class="admin-btn-secondary" onclick={close}>Cancelar</button>
						<button type="submit" class="admin-btn" disabled={formLoading || !formData.room_id}>
							{formLoading ? 'Procesando...' : 'Originando / Ir al Pago'}
						</button>
					</div>
				</form>
			{:else}
				<form onsubmit={handleCreateStep2}>
					<div class="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-lg border border-amber-200 dark:border-amber-900/50 mb-6 shadow-sm">
						<div class="flex items-center gap-3 mb-2">
							<div class="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xl">
								💰
							</div>
							<div>
								{#if initialReservation}
									<h3 class="font-bold text-amber-900 dark:text-amber-500 text-base">Agregando Pago de Saldo</h3>
								{:else}
									<h3 class="font-bold text-amber-900 dark:text-amber-500 text-base">Reservación Originada Exitosamente</h3>
								{/if}
								<p class="text-xs text-amber-700 dark:text-amber-600/70 font-mono mt-0.5">Ref Central: {pendingCreatedReservation?.unique_id}</p>
							</div>
						</div>
						
						<div class="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-800/50 flex justify-between items-end">
							<div>
								<span class="block text-[11px] uppercase tracking-wider font-bold text-amber-800/70 dark:text-amber-600/80 mb-0.5">Monto Total a Procesar</span>
								<span class="text-amber-700/60 dark:text-amber-500/60 text-xs font-medium">Impuestos incluidos</span>
							</div>
							<strong class="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tighter">${pendingCreatedReservation?.balance !== undefined ? pendingCreatedReservation.balance : pendingCreatedReservation?.total_cost}</strong>
						</div>
					</div>
					
					<div class="grid grid-cols-2 gap-4">
						<div class="admin-field">
							<label for="c-amt">Monto Extraído ($)</label>
							<input id="c-amt" type="number" step="0.01" bind:value={paymentData.amount} required />
						</div>
						<div class="admin-field">
							<label for="c-method">Método de Pago</label>
							<select id="c-method" bind:value={paymentData.method} required>
								<option value="cash">Efectivo</option>
								<option value="card">Tarjeta de Crédito/Débito</option>
								<option value="transfer">Transferencia Bancaria</option>
							</select>
						</div>
						<div class="admin-field col-span-2">
							<label for="c-receipt">Tipo de Comprobante</label>
							<select id="c-receipt" bind:value={paymentData.receipt_type} required>
								<option value="final_consumer">Consumidor Final</option>
								<option value="fiscal_credit">Crédito Fiscal</option>
							</select>
						</div>
					</div>
					<div class="admin-modal-actions mt-6">
						<button type="button" class="admin-btn-secondary" onclick={() => { show = false; onSuccess(); }}>Cerrar (Queda pendiente)</button>
						<button type="submit" class="admin-btn" disabled={formLoading}>
							{formLoading ? 'Registrando...' : 'Confirmar Pago'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
