<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from '$lib/stores/toast.svelte';
	import { fetchUserDetail, updateUser, fetchRoles, type UserUpdateAdmin } from '$lib/services/admin.service';
	import type { User, RoleRead } from '$lib/types';
	import { onMount } from 'svelte';
	import { Country, State, City } from 'country-state-city';
	import PhoneInput from '$lib/components/admin/PhoneInput.svelte';
	import '../../../adminPage.css';

	let userId = $derived(Number(page.params.id));
	let roles = $state<RoleRead[]>([]);
	let originalUser = $state<User | null>(null);
	let loading = $state(true);
	let formLoading = $state(false);
	let formError = $state<string | null>(null);
	let isPhoneValid = $state(true);

	let formData = $state({
		first_name: '',
		last_name: '',
		email: '',
		role_id: 0,
		phone: '',
		date_of_birth: '',
		country: '',
		department: '',
		municipality: '',
		address_complement: '',
		is_active: true,
		person_type: 'Natural',
		business_name: ''
	});

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
			const [userData, rolesData] = await Promise.all([
				fetchUserDetail(userId),
				fetchRoles()
			]);
			originalUser = userData;
			roles = rolesData;

			// Populate form
			const p = originalUser.profile;
			formData = {
				first_name: p?.first_name || '',
				last_name: p?.last_name || '',
				email: originalUser.email || '',
				role_id: originalUser.roles?.[0]?.id || 0,
				phone: p?.phone || '',
				date_of_birth: p?.date_of_birth || '',
				country: p?.country || 'SV',
				department: p?.department || '',
				municipality: p?.municipality || '',
				address_complement: p?.address_complement || '',
				is_active: originalUser.is_active,
				person_type: p?.person_type || 'Natural',
				business_name: p?.business_name || ''
			};
		} catch (err: any) {
			toast.error('Error al cargar datos');
			goto('/admin/usuarios');
		} finally {
			loading = false;
		}
	});

	async function handleUpdate(e: Event) {
		e.preventDefault();
		formError = null;

		if (!formData.email || !formData.first_name || (!formData.last_name && formData.person_type !== 'Juridica') || !formData.role_id) {
			formError = 'Completa los campos obligatorios.';
			return;
		}

		if (formData.phone && !isPhoneValid) {
			formError = 'El número de teléfono proporcionado no es válido para el país seleccionado.';
			return;
		}

		formLoading = true;
		try {
			const data: UserUpdateAdmin = {
				...formData,
				last_name: formData.last_name,
				business_name: formData.person_type === 'Juridica' ? formData.business_name : null,
				phone: formData.phone || null,
				date_of_birth: formData.date_of_birth || null,
				country: formData.country || null,
				department: formData.department || null,
				municipality: formData.municipality || null,
				address_complement: formData.address_complement || null
			};
			await updateUser(userId, data);
			toast.success('Usuario actualizado exitosamente');
			goto('/admin/usuarios');
		} catch (err: any) {
			formError = err.message || 'Error al actualizar usuario';
			toast.error(formError as string);
		} finally {
			formLoading = false;
		}
	}

	function cancel() {
		goto(`/admin/usuarios/${userId}`);
	}
</script>

<svelte:head>
	<title>Admin - Editar Usuario</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20 px-4 sm:px-6">
	{#if loading}
		<div class="flex flex-col items-center justify-center p-32">
			<div class="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-4"></div>
			<p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Preparando editor...</p>
		</div>
	{:else}
		<!-- Breadcrumbs & Header -->
		<div class="mb-10">
			<nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
				<a href="/admin/usuarios" class="hover:text-[#D4AF37] transition-colors">Usuarios</a>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
				<a href="/admin/usuarios/{userId}" class="hover:text-[#D4AF37] transition-colors">Perfil</a>
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
				<span class="text-slate-900 dark:text-slate-200">Editar</span>
			</nav>

			<div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
				<div>
					<button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-6" onclick={cancel}>
						<div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
						</div>
						<span class="text-xs font-black uppercase tracking-widest">Cancelar Edición</span>
					</button>

					<h1 class="admin-title !mb-2">Editar Usuario</h1>
					<p class="admin-desc">Modifica el perfil o los permisos de {originalUser?.profile?.first_name}.</p>
				</div>
			</div>
		</div>

		<form onsubmit={handleUpdate} class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			
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
								<label for="e-fname">{formData.person_type === 'Juridica' ? 'Nombres (Representante)' : 'Nombres'}</label>
								<input id="e-fname" type="text" bind:value={formData.first_name} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
							</div>
							<div class="admin-field">
								<label for="e-lname" >
									{formData.person_type === 'Juridica' ? 'Apellidos (Representante)' : 'Apellidos'}
								</label>
								<input 
									id="e-lname" 
									type="text" 
									bind:value={formData.last_name} 
									required={formData.person_type !== 'Juridica'} 
									class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl disabled:opacity-40" 
								/>
							</div>
						</div>

						{#if formData.person_type === 'Juridica'}
							<div class="admin-field fade-in">
								<label for="e-bizname">Razón Social / Nombre Comercial</label>
								<input id="e-bizname" type="text" bind:value={formData.business_name} required placeholder="Ej. Inversiones S.A. de C.V." class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl border-indigo-500/30" />
							</div>
						{/if}

						<div class="admin-field">
							<label for="e-email">Correo Electrónico</label>
							<input id="e-email" type="email" bind:value={formData.email} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl" />
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
								<label for="e-dob">Fecha de Nacimiento</label>
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
								<label for="e-dept">Estado / Depto</label>
								<select id="e-dept" bind:value={formData.department} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
									<option value="">Selecciona...</option>
									{#each departments as d}
										<option value={d.isoCode}>{d.name}</option>
									{/each}
								</select>
							</div>
							<div class="admin-field">
								<label for="e-city">Ciudad / Municipio</label>
								<select id="e-city" bind:value={formData.municipality} class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
									<option value="">Selecciona...</option>
									{#each municipalities as m}
										<option value={m.name}>{m.name}</option>
									{/each}
								</select>
							</div>
						</div>

						<div class="admin-field">
							<label for="e-addr">Dirección Residencial</label>
							<textarea id="e-addr" bind:value={formData.address_complement} rows="2" class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl resize-none"></textarea>
						</div>
					</div>
				</div>
			</div>

			<!-- Sidebar: Role & Status -->
			<div class="lg:col-span-4 space-y-6">
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 sticky top-8">
					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Estado y Acceso
					</h3>

					<div class="space-y-6">
						<div class="admin-field">
							<label for="e-role">Rol del Sistema</label>
							<select id="e-role" bind:value={formData.role_id} required class="!bg-slate-50 dark:!bg-slate-800/50 !rounded-2xl">
								{#each roles as r}
									<option value={r.id}>{r.name}</option>
								{/each}
							</select>
						</div>

						<div class="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
							<div>
								<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado de Cuenta</span>
								<span class="text-xs font-bold {formData.is_active ? 'text-emerald-500' : 'text-rose-500'}">
									{formData.is_active ? 'Usuario Activo' : 'Usuario Inactivo'}
								</span>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={formData.is_active} class="sr-only peer">
								<div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
							</label>
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
								{formLoading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
							</button>

							<button type="button" class="admin-btn-secondary w-full mt-3 !rounded-2xl py-4" onclick={cancel}>
								CANCELAR
							</button>
						</div>
					</div>
				</div>
			</div>
		</form>
	{/if}
</div>
