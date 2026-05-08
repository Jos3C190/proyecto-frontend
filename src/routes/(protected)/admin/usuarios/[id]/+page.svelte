<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { fetchUserDetail } from '$lib/services/admin.service';
	import type { User } from '$lib/types';
	import { Country, State } from 'country-state-city';
	import '../../adminPage.css';

	let userId = $derived(Number(page.params.id));
	let user = $state<User | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	function getCountryName(code: string | null | undefined): string {
		if (!code) return 'N/D';
		return Country.getCountryByCode(code)?.name || code;
	}

	function getStateName(countryCode: string | null | undefined, stateCode: string | null | undefined): string {
		if (!countryCode || !stateCode) return 'N/D';
		return State.getStateByCodeAndCountry(stateCode, countryCode)?.name || stateCode;
	}

	function formatDate(isoDate: string | null | undefined): string {
		if (!isoDate) return 'N/D';
		try {
			// Append T00:00:00 to avoid UTC timezone shift issues
			const dateObj = isoDate.includes('T') ? new Date(isoDate) : new Date(isoDate + 'T00:00:00');
			return dateObj.toLocaleDateString('es-SV', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return isoDate;
		}
	}

	onMount(async () => {
		try {
			if (!userId) throw new Error("ID de usuario inválido");
			// Asumiendo que fetchUserDetail existe en admin.service.ts
			user = await fetchUserDetail(userId);
		} catch (e: any) {
			error = e.message || 'Error al cargar el usuario';
		} finally {
			loading = false;
		}
	});

	function goBack() {
		goto('/admin/usuarios');
	}

	function goEdit() {
		goto(`/admin/usuarios/${userId}/editar`);
	}
</script>

<svelte:head>
	<title>Admin - Perfil de Usuario</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20 px-4 sm:px-6">
	<!-- Breadcrumbs & Header -->
	<div class="mb-10">
		<nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
			<a href="/admin/usuarios" class="hover:text-[#D4AF37] transition-colors">Usuarios</a>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
			<span class="text-slate-900 dark:text-slate-200">Perfil de Personal</span>
		</nav>

		<div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
			<div>
				<button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-6" onclick={goBack}>
					<div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</div>
					<span class="text-xs font-black uppercase tracking-widest">Volver al Listado</span>
				</button>

				<h1 class="admin-title !mb-2">Expediente de Usuario</h1>
				<p class="admin-desc">Datos de contacto, ubicación y privilegios de acceso del personal.</p>
			</div>

			<div class="flex items-center gap-3">
				<button class="admin-btn !rounded-2xl shadow-xl px-8" onclick={goEdit}>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
					Editar Usuario
				</button>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center p-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
			<div class="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6"></div>
			<p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando perfil...</p>
		</div>
	{:else if error}
		<div class="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-10 rounded-[32px] text-center max-w-2xl mx-auto shadow-sm">
			<p class="text-rose-600 font-bold italic">{error}</p>
			<button class="mt-6 admin-btn-secondary" onclick={goBack}>Volver</button>
		</div>
	{:else if user}
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			
			<!-- Left: Main Profile Info -->
			<div class="lg:col-span-8 space-y-8">
				
				<!-- Información Personal -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
					<div class="absolute top-0 right-0 p-8">
						<span class="px-4 py-1.5 bg-[#D4AF37]/10 text-[#AA8222] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#D4AF37]/20">
							{user.roles?.[0]?.name || 'Sin Rol'}
						</span>
					</div>

					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Datos del Personal
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre Completo</label>
							<p class="text-lg font-bold text-slate-900 dark:text-white">
								{#if user.profile?.person_type === 'Juridica'}
									{user.profile.business_name || user.profile.first_name}
								{:else}
									{user.profile?.first_name} {user.profile?.last_name === 'N/A' ? '' : user.profile?.last_name || ''}
								{/if}
							</p>
						</div>

						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Correo Institucional</label>
							<p class="text-lg font-bold text-slate-900 dark:text-white">
								{user.email}
							</p>
						</div>

						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Teléfono / Celular</label>
							<p class="text-sm font-bold text-slate-900 dark:text-white">{user.profile?.phone || '---'}</p>
						</div>
						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fecha de Nacimiento</label>
							<p class="text-sm font-bold text-slate-900 dark:text-white">{formatDate(user.profile?.date_of_birth)}</p>
						</div>
					</div>
				</div>

				<!-- Ubicación -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Ubicación
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
						<div class="md:col-span-2 grid grid-cols-3 gap-6 pt-4">
							<div>
								<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">País</label>
								<p class="text-xs font-bold text-slate-600 dark:text-slate-400">{getCountryName(user.profile?.country)}</p>
							</div>
							<div>
								<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Departamento</label>
								<p class="text-xs font-bold text-slate-600 dark:text-slate-400">{getStateName(user.profile?.country, user.profile?.department)}</p>
							</div>
							<div>
								<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Municipio</label>
								<p class="text-xs font-bold text-slate-600 dark:text-slate-400">{user.profile?.municipality || '---'}</p>
							</div>
						</div>

						<div class="md:col-span-2 border-t border-slate-50 dark:border-slate-800 pt-8">
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Dirección Residencial</label>
							<p class="text-sm font-bold text-slate-700 dark:text-slate-300">
								{user.profile?.address_complement || 'Sin dirección registrada'}
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Right: System Info -->
			<div class="lg:col-span-4 sticky top-8 space-y-6">
				<!-- Account Card -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden relative">
					<div class="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
					
					<div class="flex flex-col items-center mb-8 relative">
						<div class="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-xl mb-4">
							<span class="text-2xl font-black text-[#D4AF37] uppercase">{user.profile?.first_name?.charAt(0) || 'U'}</span>
						</div>
						<h2 class="text-lg font-black text-slate-900 dark:text-white tracking-tight">
							{#if user.profile?.person_type === 'Juridica'}
								{user.profile.business_name || user.profile.first_name}
							{:else}
								{user.profile?.first_name} {user.profile?.last_name === 'N/A' ? '' : user.profile?.last_name || ''}
							{/if}
						</h2>
						<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{user.email}</p>
					</div>

					<div class="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800 relative">
						<div class="flex justify-between items-center">
							<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
							<span class="px-2 py-0.5 {user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} text-[9px] font-black uppercase tracking-widest rounded-lg">
								{user.is_active ? 'Activo' : 'Inactivo'}
							</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rol Principal</span>
							<span class="text-xs font-bold text-slate-900 dark:text-white">{user.roles?.[0]?.name || 'N/D'}</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
