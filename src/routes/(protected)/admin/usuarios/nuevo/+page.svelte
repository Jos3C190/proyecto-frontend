<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from '$lib/stores/toast.svelte';
	import { createUser, fetchRoles, type UserCreateAdmin } from '$lib/services/admin.service';
	import type { RoleRead } from '$lib/types';
	import { onMount } from 'svelte';
	import { Country, State, City } from 'country-state-city';
	import PhoneInput from '$lib/components/admin/PhoneInput.svelte';
	import '../../adminPage.css';

	let formData = $state({
		first_name: '',
		last_name: '',
		email: '',
		password: '',
		role_id: 0,
		phone: '',
		date_of_birth: '',
		country: 'SV',
		department: '',
		municipality: '',
		address_complement: '',
		person_type: 'Natural',
		business_name: ''
	});

	let roles = $state<RoleRead[]>([]);
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

	onMount(async () => {
		try {
			roles = await fetchRoles();
			if (roles.length > 0) {
				// Buscar un rol por defecto que no sea cliente si es posible
				const defaultRole = roles.find(r => r.name !== 'cliente') || roles[0];
				formData.role_id = defaultRole.id;
			}
		} catch (err) {
			toast.error('Error al cargar roles');
		}
	});

	async function handleCreate(e: Event) {
		e.preventDefault();
		formError = null;

		if (!formData.email || !formData.first_name || !formData.last_name || !formData.password || !formData.role_id) {
			formError = 'Completa los campos obligatorios.';
			return;
		}

		if (formData.phone && !isPhoneValid) {
			formError = 'El número de teléfono proporcionado no es válido para el país seleccionado.';
			return;
		}

		formLoading = true;
		try {
			const data: UserCreateAdmin = {
				...formData,
				phone: formData.phone || null,
				date_of_birth: formData.date_of_birth || null,
				country: formData.country || null,
				department: formData.department || null,
				municipality: formData.municipality || null,
				address_complement: formData.address_complement || null,
				person_type: formData.person_type,
				business_name: formData.person_type === 'Juridica' ? formData.business_name : null,
				last_name: formData.last_name
			};
			await createUser(data);
			toast.success('Usuario creado exitosamente');
			goto('/admin/usuarios');
		} catch (err: any) {
			formError = err.message || 'Error al crear usuario';
			toast.error(formError as string);
		} finally {
			formLoading = false;
		}
	}

	function cancel() {
		goto('/admin/usuarios');
	}
</script>

<svelte:head>
	<title>Admin - Nuevo Usuario</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20 px-4 sm:px-6">
	<!-- Breadcrumbs & Header -->
	<div class="mb-10">
		<nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
			<a href="/admin/usuarios" class="hover:text-[#D4AF37] transition-colors">Usuarios</a>
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

				<h1 class="admin-title !mb-2">Nuevo Usuario</h1>
				<p class="admin-desc">Registra un nuevo miembro del personal y asigna sus privilegios de acceso.</p>
			</div>
		</div>
	</div>

	<form onsubmit={handleCreate} class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
		
		<!-- Main Form Sections -->
		<div class="lg:col-span-8 space-y-8">
			
			<!-- Perfil Básico -->
			<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
				<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
					<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
					Perfil Personal
				</h3>

				<div class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="admin-field">
							<label for="u-type">Tipo de Persona</label>
							<select id="u-type" bind:value={formData.person_type} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								<option value="Natural">Persona Natural</option>
								<option value="Juridica">Persona Jurídica</option>
							</select>
						</div>
						<div class="admin-field">
							<label for="u-fname">{formData.person_type === 'Juridica' ? 'Nombres (Representante)' : 'Nombres'}</label>
							<input id="u-fname" type="text" bind:value={formData.first_name} required placeholder="Ej. Juan" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="admin-field">
							<label for="u-lname" >
								{formData.person_type === 'Juridica' ? 'Apellidos (Representante)' : 'Apellidos'}
							</label>
							<input 
								id="u-lname" 
								type="text" 
								bind:value={formData.last_name} 
								required 
								placeholder="Ej. Pérez" 
								class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" 
							/>
						</div>
						{#if formData.person_type === 'Juridica'}
							<div class="admin-field fade-in">
								<label for="u-bizname">Razón Social / Nombre Comercial</label>
								<input id="u-bizname" type="text" bind:value={formData.business_name} required placeholder="Ej. Inversiones S.A. de C.V." class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl border-indigo-500/30" />
							</div>
						{/if}
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="admin-field">
							<label for="u-email">Correo Electrónico</label>
							<input id="u-email" type="email" bind:value={formData.email} required placeholder="juan.perez@hotel.com" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
						<div class="admin-field">
							<label for="u-pass">Contraseña Temporal</label>
							<input id="u-pass" type="password" bind:value={formData.password} required placeholder="••••••••" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
					</div>
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
						<PhoneInput bind:value={formData.phone} bind:isValid={isPhoneValid} label="Teléfono / Extensión" />
						<div class="admin-field">
							<label for="u-dob">Fecha de Nacimiento</label>
							<input id="u-dob" type="date" bind:value={formData.date_of_birth} max={maxDobString} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
						</div>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div class="admin-field">
							<label for="u-country">País</label>
							<select id="u-country" bind:value={formData.country} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								{#each countries as c}
									<option value={c.isoCode}>{c.name}</option>
								{/each}
							</select>
						</div>
						<div class="admin-field">
							<label for="u-dept">Estado / Depto</label>
							<select id="u-dept" bind:value={formData.department} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								<option value="">Selecciona...</option>
								{#each departments as d}
									<option value={d.isoCode}>{d.name}</option>
								{/each}
							</select>
						</div>
						<div class="admin-field">
							<label for="u-city">Ciudad / Municipio</label>
							<select id="u-city" bind:value={formData.municipality} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								<option value="">Selecciona...</option>
								{#each municipalities as m}
									<option value={m.name}>{m.name}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="admin-field">
						<label for="u-addr">Dirección Residencial</label>
						<textarea id="u-addr" bind:value={formData.address_complement} placeholder="Calle, número de casa, etc." rows="2" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl resize-none"></textarea>
					</div>
				</div>
			</div>
		</div>

		<!-- Sidebar: Role & Status -->
		<div class="lg:col-span-4 space-y-6">
			<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 sticky top-8">
				<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
					<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
					Acceso y Roles
				</h3>

				<div class="space-y-6">
					<div class="admin-field">
						<label for="u-role">Rol del Sistema</label>
						<select id="u-role" bind:value={formData.role_id} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
							{#each roles as r}
								<option value={r.id}>{r.name}</option>
							{/each}
						</select>
						<p class="mt-3 text-[10px] text-slate-400 font-bold leading-relaxed">
							El rol determina los módulos a los que el usuario podrá acceder y las acciones que puede realizar.
						</p>
					</div>

					<div class="pt-6 border-t border-slate-50 dark:border-slate-800">
						{#if formError}
							<div class="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl text-rose-600 text-xs font-bold mb-6 flex items-center gap-3">
								<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
								{formError}
							</div>
						{/if}

						<button type="submit" class="admin-btn w-full !rounded-2xl py-4 shadow-xl shadow-[#D4AF37]/20 flex items-center justify-center gap-3" disabled={formLoading}>
							{#if formLoading}
								<div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
							{/if}
							{formLoading ? 'Procesando...' : 'CREAR USUARIO'}
						</button>

						<button type="button" class="admin-btn-secondary w-full mt-3 !rounded-2xl py-4" onclick={cancel}>
							CANCELAR
						</button>
					</div>
				</div>
			</div>
		</div>
	</form>
</div>
