<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { updateClient, fetchClientDetail, type UserUpdateAdmin } from '$lib/services/admin.service';
	import { Country, State, City } from 'country-state-city';
	import PhoneInput from '$lib/components/admin/PhoneInput.svelte';
	import '../../../adminPage.css';

	let clientId = $derived(Number(page.params.id));
	let loading = $state(true);
	let error = $state<string | null>(null);

	let formData = $state({
		first_name: '',
		last_name: '',
		email: '',
		phone: '',
		date_of_birth: '',
		country: 'SV',
		department: '',
		municipality: '',
		address_complement: '',
		person_type: 'Natural',
		business_name: '',
		nrc: '',
		document_type: 'DUI',
		document_number: '',
		nit: '',
		economic_activity: ''
	});

	let formError = $state<string | null>(null);
	let formLoading = $state(false);
	let isPhoneValid = $state(true);

	let countries = $derived(Country.getAllCountries());
	let departments = $derived(formData.country ? State.getStatesOfCountry(formData.country) : []);
	let municipalities = $derived(
		formData.country && formData.department ? City.getCitiesOfState(formData.country, formData.department) : []
	);

	let maxDobString = $derived.by(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 18);
		return d.toISOString().split('T')[0];
	});

	// --- Funciones de Formateo ---
	function formatDUI(val: string) {
		let v = val.replace(/\D/g, '');
		if (v.length > 9) v = v.slice(0, 9);
		if (v.length > 8) return v.slice(0, 8) + '-' + v.slice(8);
		return v;
	}

	function formatNIT(val: string) {
		let v = val.replace(/\D/g, '');
		if (v.length > 14) v = v.slice(0, 14);
		let formatted = '';
		if (v.length > 0) formatted += v.slice(0, 4);
		if (v.length > 4) formatted += '-' + v.slice(4, 10);
		if (v.length > 10) formatted += '-' + v.slice(10, 13);
		if (v.length > 13) formatted += '-' + v.slice(13, 14);
		return formatted;
	}

	function formatNRC(val: string) {
		let v = val.replace(/\D/g, '');
		if (v.length > 8) v = v.slice(0, 8);
		if (v.length > 1) {
			const dashPos = v.length - 1;
			return v.slice(0, dashPos) + '-' + v.slice(dashPos);
		}
		return v;
	}

	// --- Mascaras de Entrada ---
	function applyDocumentMask(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value;
		
		if (formData.document_type === 'DUI') {
			input.value = formatDUI(val);
		} else {
			input.value = val.toUpperCase();
		}
		formData.document_number = input.value;
	}

	function applyNITMask(e: Event) {
		const input = e.target as HTMLInputElement;
		input.value = formatNIT(input.value);
		formData.nit = input.value;
	}

	function applyNRCMask(e: Event) {
		const input = e.target as HTMLInputElement;
		input.value = formatNRC(input.value);
		formData.nrc = input.value;
	}

	onMount(async () => {
		try {
			if (!clientId) throw new Error("ID de cliente inválido");
			const user = await fetchClientDetail(clientId);
			
			formData = {
				first_name: user.profile?.first_name ?? '',
				last_name: user.profile?.last_name ?? '',
				email: user.email,
				phone: user.profile?.phone ?? '',
				date_of_birth: user.profile?.date_of_birth ?? '',
				country: user.profile?.country ?? 'SV',
				department: user.profile?.department ?? '',
				municipality: user.profile?.municipality ?? '',
				address_complement: user.profile?.address_complement ?? '',
				person_type: user.profile?.person_type ?? 'Natural',
				business_name: user.profile?.business_name ?? '',
				nrc: formatNRC(user.profile?.nrc ?? ''),
				document_type: user.profile?.document_type ?? 'DUI',
				document_number: user.profile?.document_type === 'DUI' 
					? formatDUI(user.profile?.document_number ?? '') 
					: (user.profile?.document_number ?? ''),
				nit: formatNIT(user.profile?.nit ?? ''),
				economic_activity: user.profile?.economic_activity ?? ''
			};
		} catch (e: any) {
			error = e.message || 'Error al cargar el cliente';
		} finally {
			loading = false;
		}
	});

	async function handleUpdate(e: Event) {
		e.preventDefault();
		formError = null;

		if (formData.person_type === 'Juridica' && !formData.nrc) {
			formError = 'El NRC es obligatorio para personas jurídicas.';
			return;
		}

		if (formData.phone && !isPhoneValid) {
			formError = 'El número de teléfono proporcionado no es válido para el país seleccionado.';
			return;
		}

		formLoading = true;
		try {
			const data: UserUpdateAdmin = {
				first_name: formData.first_name,
				last_name: formData.last_name,
				business_name: formData.person_type === 'Juridica' ? formData.business_name : null,
				email: formData.email,
				phone: formData.phone || null,
				date_of_birth: formData.date_of_birth || null,
				country: formData.country || null,
				department: formData.department || null,
				municipality: formData.municipality || null,
				address_complement: formData.address_complement || null,
				person_type: formData.person_type,
				nrc: formData.person_type === 'Juridica' ? formData.nrc || null : null,
				document_type: formData.document_type,
				document_number: formData.document_number || null,
				nit: formData.nit || null,
				economic_activity: formData.economic_activity || null
			};
			await updateClient(clientId, data);
			toast.success('Perfil actualizado correctamente');
			goto('/admin/clientes');
		} catch (err: any) {
			formError = err.message || 'Error al actualizar cliente';
			toast.error(formError as string);
		} finally {
			formLoading = false;
		}
	}

	function cancel() {
		goto('/admin/clientes');
	}
</script>

<svelte:head>
	<title>Admin - Editar Cliente</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20 px-4 sm:px-6">
	<!-- Breadcrumbs & Header -->
	<div class="mb-10">
		<nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
			<a href="/admin/clientes" class="hover:text-[#D4AF37] transition-colors">Clientes</a>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
			<span class="text-slate-900 dark:text-slate-200">Editar Perfil</span>
		</nav>

		<div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
			<div>
				<button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-6" onclick={cancel}>
					<div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</div>
					<span class="text-xs font-black uppercase tracking-widest">Volver al Listado</span>
				</button>

				<h1 class="admin-title !mb-2">Editar Cliente</h1>
				<p class="admin-desc">Actualiza la información de contacto y perfiles fiscales de facturación.</p>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center p-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
			<div class="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6"></div>
			<p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Obteniendo datos del cliente...</p>
		</div>
	{:else if error}
		<div class="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-10 rounded-[32px] text-center max-w-2xl mx-auto shadow-sm">
			<p class="text-rose-600 font-bold italic">{error}</p>
			<button class="mt-6 admin-btn-secondary" onclick={cancel}>Volver</button>
		</div>
	{:else}
		<form onsubmit={handleUpdate} class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			
			<!-- Main Form Sections -->
			<div class="lg:col-span-8 space-y-8">
				
				<!-- Perfil e Identificación -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Perfil e Identificación
					</h3>

					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="admin-field">
								<label for="e-type">Tipo de Contribuyente</label>
								<select id="e-type" bind:value={formData.person_type} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
									<option value="Natural">Persona Natural</option>
									<option value="Juridica">Persona Jurídica</option>
								</select>
							</div>
							<div class="admin-field">
								<label for="e-doc-type">Tipo de Documento</label>
								<select id="e-doc-type" bind:value={formData.document_type} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
									<option value="DUI">DUI (El Salvador)</option>
									<option value="Pasaporte">Pasaporte</option>
									<option value="Residente">Carnet de Residente</option>
									<option value="Otro">Otro</option>
								</select>
							</div>
							<div class="admin-field">
								<label for="e-doc-num">
									{formData.document_type} {formData.person_type === 'Juridica' ? '(Representante)' : ''}
								</label>
								<input 
									id="e-doc-num" 
									type="text" 
									value={formData.document_number} 
									oninput={applyDocumentMask} 
									placeholder={formData.document_type === 'DUI' ? '00000000-0' : 'Ingrese número'} 
									class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" 
								/>
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div class="admin-field">
								<label for="e-fname">
									{formData.person_type === 'Juridica' ? 'Nombres (Representante)' : 'Nombres'}
								</label>
								<input id="e-fname" type="text" bind:value={formData.first_name} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
							</div>
							<div class="admin-field">
								<label for="e-lname">
									{formData.person_type === 'Juridica' ? 'Apellidos (Representante)' : 'Apellidos'}
								</label>
								<input id="e-lname" type="text" bind:value={formData.last_name} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
							</div>
						</div>

						{#if formData.person_type === 'Juridica'}
							<div class="admin-field fade-in">
								<label for="e-bizname">Razón Social / Nombre Comercial</label>
								<input id="e-bizname" type="text" bind:value={formData.business_name} required placeholder="Ej. Inversiones S.A. de C.V." class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl border-indigo-500/30" />
							</div>
						{/if}

						{#if formData.person_type === 'Juridica'}
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
								<div class="admin-field">
									<label for="e-nrc">NRC</label>
									<input id="e-nrc" type="text" value={formData.nrc} oninput={applyNRCMask} placeholder="000000-0" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
								</div>
								<div class="admin-field">
									<label for="e-nit">NIT</label>
									<input id="e-nit" type="text" value={formData.nit} oninput={applyNITMask} placeholder="0000-000000-000-0" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
								</div>
							</div>
							<div class="admin-field fade-in">
								<label for="e-act">Actividad Económica</label>
								<input id="e-act" type="text" bind:value={formData.economic_activity} placeholder="Ej. Servicios de Consultoría" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
							</div>
						{/if}
					</div>
				</div>

				<!-- Ubicación y Contacto -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Ubicación y Contacto
					</h3>

					<div class="space-y-6">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<PhoneInput bind:value={formData.phone} bind:isValid={isPhoneValid} label="Teléfono / Celular" />
							<div class="admin-field">
								<label for="e-dob">Fecha de Nacimiento / Constitución</label>
								<input id="e-dob" type="date" bind:value={formData.date_of_birth} max={maxDobString} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
							</div>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div class="admin-field">
								<label for="e-country">País</label>
								<select id="e-country" bind:value={formData.country} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
									{#each countries as c}
										<option value={c.isoCode}>{c.name}</option>
									{/each}
								</select>
							</div>
							<div class="admin-field">
								<label for="e-state">Departamento</label>
								<select id="e-state" bind:value={formData.department} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" disabled={!departments.length}>
									<option value="">Seleccionar...</option>
									{#each departments as d}
										<option value={d.isoCode}>{d.name}</option>
									{/each}
								</select>
							</div>
							<div class="admin-field">
								<label for="e-city">Municipio</label>
								<select id="e-city" bind:value={formData.municipality} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" disabled={!municipalities.length}>
									<option value="">Seleccionar...</option>
									{#each municipalities as m}
										<option value={m.name}>{m.name}</option>
									{/each}
								</select>
							</div>
						</div>

						<div class="admin-field">
							<label for="e-addr">Dirección Detallada</label>
							<input id="e-addr" type="text" bind:value={formData.address_complement} placeholder="Residencial, Calle, Pasaje, # Casa" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
					</div>
				</div>
			</div>

			<!-- Sidebar: Cuenta y Acciones -->
			<div class="lg:col-span-4 sticky top-8 space-y-6">
				<div class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden relative">
					<div class="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
					
					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Cuenta de Usuario
					</h3>

					<div class="space-y-6 relative">
						<div class="admin-field">
							<label for="e-email">Correo Electrónico</label>
							<input id="e-email" type="email" bind:value={formData.email} required placeholder="cliente@ejemplo.com" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>

						<div class="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl text-[10px] text-amber-700 dark:text-amber-500 font-bold leading-relaxed italic">
							Nota: La contraseña no se puede modificar desde este panel por políticas de seguridad. El cliente debe restablecerla desde su portal.
						</div>

						<div class="pt-6 border-t border-slate-100 dark:border-slate-800">
							{#if formError}
								<div class="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl mb-6 text-rose-600 dark:text-rose-400 text-[11px] font-bold italic leading-relaxed">
									{formError}
								</div>
							{/if}

							<button type="submit" class="admin-btn w-full !py-4 shadow-2xl disabled:opacity-50" disabled={formLoading}>
								{#if formLoading}
									<div class="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
								{:else}
									Guardar Cambios
								{/if}
							</button>
							<button type="button" class="admin-btn-secondary w-full !py-3 mt-4 border-transparent hover:!bg-slate-50 dark:hover:!bg-slate-800/50" onclick={cancel}>
								Cancelar Edición
							</button>
						</div>
					</div>
				</div>

				<div class="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-700">
					<p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Información de Sistema</p>
					<div class="space-y-2">
						<div class="flex justify-between text-[11px] font-bold">
							<span class="text-slate-500">ID Cliente</span>
							<span class="text-slate-900 dark:text-white">#{clientId}</span>
						</div>
						<div class="flex justify-between text-[11px] font-bold">
							<span class="text-slate-500">Estado</span>
							<span class="text-emerald-600">Activo</span>
						</div>
					</div>
				</div>
			</div>
		</form>
	{/if}
</div>
