<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import { createClient, type UserCreateAdmin } from '$lib/services/admin.service';
	import { Country, State, City } from 'country-state-city';
	import PhoneInput from '$lib/components/admin/PhoneInput.svelte';
	import '../../adminPage.css';

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

	// --- Mascaras de Entrada ---
	function applyDocumentMask(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value;

		if (formData.document_type === 'DUI') {
			let v = val.replace(/\D/g, ''); // Solo numeros
			if (v.length > 9) v = v.slice(0, 9);
			if (v.length > 8) {
				input.value = v.slice(0, 8) + '-' + v.slice(8);
			} else {
				input.value = v;
			}
		} else {
			// Pasaporte o Carnet: Alfanumerico libre
			input.value = val.toUpperCase();
		}
		formData.document_number = input.value;
	}

	function applyNITMask(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value.replace(/\D/g, '');
		if (val.length > 14) val = val.slice(0, 14);

		let formatted = '';
		if (val.length > 0) formatted += val.slice(0, 4);
		if (val.length > 4) formatted += '-' + val.slice(4, 10);
		if (val.length > 10) formatted += '-' + val.slice(10, 13);
		if (val.length > 13) formatted += '-' + val.slice(13, 14);
		
		input.value = formatted;
		formData.nit = input.value;
	}

	function applyNRCMask(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value.replace(/\D/g, '');
		if (val.length > 8) val = val.slice(0, 8); // Ajuste segun formato comun 6-7 digitos + 1

		if (val.length > 1) {
			// Formato: XXXXXX-X (los ultimos digitos son el control)
			// Usualmente son 6 o 7 digitos antes del guion
			const dashPos = val.length - 1;
			input.value = val.slice(0, dashPos) + '-' + val.slice(dashPos);
		} else {
			input.value = val;
		}
		formData.nrc = input.value;
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		formError = null;

		if (!formData.email || !formData.first_name || !formData.last_name) {
			formError = 'Completa los campos obligatorios principales.';
			return;
		}

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
			const data: any = {
				first_name: formData.first_name,
				last_name: formData.last_name,
				business_name: formData.person_type === 'Juridica' ? formData.business_name : null,
				email: formData.email,
				role_id: 1, 
				phone: formData.phone || null,
				date_of_birth: formData.date_of_birth || null,
				country: formData.country || null,
				department: formData.department || null,
				municipality: formData.municipality || null,
				address_complement: formData.address_complement || null,
				person_type: formData.person_type,
				document_type: formData.document_type,
				document_number: formData.document_number || null,
				nit: formData.nit || null,
				nrc: formData.nrc || null,
				economic_activity: formData.economic_activity || null
			};
			await createClient(data);
			toast.success('Cliente registrado exitosamente. Se ha enviado un correo con las credenciales de acceso.');
			goto('/admin/clientes');
		} catch (err: any) {
			formError = err.message || 'Error al crear cliente';
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
	<title>Admin - Nuevo Cliente</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20 px-4 sm:px-6">
	<!-- Breadcrumbs & Header -->
	<div class="mb-10">
		<nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
			<a href="/admin/clientes" class="hover:text-[#D4AF37] transition-colors">Clientes</a>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
			<span class="text-slate-900 dark:text-slate-200">Nuevo Registro</span>
		</nav>

		<div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
			<div>
				<button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-6" onclick={cancel}>
					<div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</div>
					<span class="text-xs font-black uppercase tracking-widest">Volver al Listado</span>
				</button>

				<h1 class="admin-title !mb-2">Nuevo Cliente</h1>
				<p class="admin-desc">Ingresa los datos personales y el perfil de facturación del nuevo cliente.</p>
			</div>
		</div>
	</div>

	<form onsubmit={handleCreate} class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
		
		<!-- Main Form Sections -->
		<div class="lg:col-span-8 space-y-8">
			
			<!-- Perfil Básico e Identificación -->
			<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
				<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
					<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
					Perfil e Identificación
				</h3>

				<div class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="admin-field">
							<label for="c-type">Tipo de Contribuyente</label>
							<select id="c-type" bind:value={formData.person_type} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								<option value="Natural">Persona Natural</option>
								<option value="Juridica">Persona Jurídica</option>
							</select>
						</div>
						<div class="admin-field">
							<label for="c-doc-type">Tipo de Documento</label>
							<select id="c-doc-type" bind:value={formData.document_type} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								<option value="DUI">DUI (El Salvador)</option>
								<option value="Pasaporte">Pasaporte</option>
								<option value="Residente">Carnet de Residente</option>
								<option value="Otro">Otro</option>
							</select>
						</div>
						<div class="admin-field">
							<label for="c-doc-num">
								{formData.document_type} {formData.person_type === 'Juridica' ? '(Representante)' : ''}
							</label>
							<input 
								id="c-doc-num" 
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
							<label for="c-fname">
								{formData.person_type === 'Juridica' ? 'Nombres (Representante)' : 'Nombres'}
							</label>
							<input id="c-fname" type="text" bind:value={formData.first_name} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
						<div class="admin-field">
							<label for="c-lname">
								{formData.person_type === 'Juridica' ? 'Apellidos (Representante)' : 'Apellidos'}
							</label>
							<input id="c-lname" type="text" bind:value={formData.last_name} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
					</div>

					{#if formData.person_type === 'Juridica'}
						<div class="admin-field fade-in">
							<label for="c-bizname">Razón Social / Nombre Comercial</label>
							<input id="c-bizname" type="text" bind:value={formData.business_name} required placeholder="Ej. Inversiones S.A. de C.V." class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl border-indigo-500/30" />
						</div>
					{/if}

					{#if formData.person_type === 'Juridica'}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
							<div class="admin-field">
								<label for="c-nrc">NRC</label>
								<input id="c-nrc" type="text" value={formData.nrc} oninput={applyNRCMask} placeholder="000000-0" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
							</div>
							<div class="admin-field">
								<label for="c-nit">NIT</label>
								<input id="c-nit" type="text" value={formData.nit} oninput={applyNITMask} placeholder="0000-000000-000-0" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
							</div>
						</div>
						<div class="admin-field fade-in">
							<label for="c-act">Actividad Económica</label>
							<input id="c-act" type="text" bind:value={formData.economic_activity} placeholder="Ej. Servicios de Consultoría" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
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
							<label for="c-dob">Fecha de Nacimiento / Constitución</label>
							<input id="c-dob" type="date" bind:value={formData.date_of_birth} max={maxDobString} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="admin-field">
							<label for="c-country">País</label>
							<select id="c-country" bind:value={formData.country} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								{#each countries as c}
									<option value={c.isoCode}>{c.name}</option>
								{/each}
							</select>
						</div>
						<div class="admin-field">
							<label for="c-state">Departamento</label>
							<select id="c-state" bind:value={formData.department} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" disabled={!departments.length}>
								<option value="">Seleccionar...</option>
								{#each departments as d}
									<option value={d.isoCode}>{d.name}</option>
								{/each}
							</select>
						</div>
						<div class="admin-field">
							<label for="c-city">Municipio</label>
							<select id="c-city" bind:value={formData.municipality} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" disabled={!municipalities.length}>
								<option value="">Seleccionar...</option>
								{#each municipalities as m}
									<option value={m.name}>{m.name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="admin-field">
						<label for="c-addr">Dirección Detallada</label>
						<input id="c-addr" type="text" bind:value={formData.address_complement} placeholder="Residencial, Calle, Pasaje, # Casa" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
					</div>
				</div>
			</div>
		</div>

		<!-- Sidebar: Credenciales y Acciones -->
		<div class="lg:col-span-4 sticky top-8 space-y-6">
			<div class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden relative">
				<div class="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
				
				<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
					<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
					Acceso al Sistema
				</h3>

				<div class="space-y-6 relative">
					<div class="admin-field">
						<label for="c-email">Correo Electrónico</label>
						<input id="c-email" type="email" bind:value={formData.email} required placeholder="cliente@ejemplo.com" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
					</div>
					<div class="p-4 bg-[#D4AF37]/5 rounded-2xl border border-[#D4AF37]/10 mb-6">
						<p class="text-[10px] text-[#AA8222] font-black uppercase tracking-widest mb-1">Nota de Seguridad</p>
						<p class="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
							La contraseña se generará automáticamente y se mostrará al completar el registro para que pueda ser enviada al cliente.
						</p>
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
								Registrar Cliente
							{/if}
						</button>
						<button type="button" class="admin-btn-secondary w-full !py-3 mt-4 border-transparent hover:!bg-slate-50 dark:hover:!bg-slate-800/50" onclick={cancel}>
							Descartar Cambios
						</button>
					</div>
				</div>
			</div>

			<!-- Tip -->
			<div class="p-6 bg-[#AA8222]/5 rounded-[24px] border border-[#AA8222]/10">
				<div class="flex gap-4">
					<svg class="w-5 h-5 text-[#AA8222] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"/></svg>
					<p class="text-[11px] text-[#AA8222] font-bold leading-relaxed italic">
						La información fiscal capturada será utilizada para la generación automática de Documentos Tributarios Electrónicos (DTE).
					</p>
				</div>
			</div>
		</div>
	</form>
</div>
