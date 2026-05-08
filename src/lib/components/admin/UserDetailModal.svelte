<script lang="ts">
	import type { User } from '$lib/types';
	import { Country, State } from 'country-state-city';

	let { user, onClose }: { user: User; onClose: () => void } = $props();

	function getCountryName(iso: string | null | undefined) {
		if (!iso) return 'N/D';
		return Country.getCountryByCode(iso)?.name || iso;
	}

	function getDeptName(countryIso: string | null | undefined, deptIso: string | null | undefined) {
		if (!countryIso || !deptIso) return 'N/D';
		return State.getStateByCodeAndCountry(deptIso, countryIso)?.name || deptIso;
	}
</script>

<div class="admin-modal-overlay" role="dialog" aria-modal="true">
	<div class="admin-modal" style="max-width: 650px;">
		<h2 class="admin-modal-title">Detalle de Usuario</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
			<div class="flex flex-col gap-1">
				<span class="text-xs uppercase text-gray-500 font-semibold tracking-wider">ID Usuario</span>
				<span class="font-medium text-gray-900 dark:text-gray-100">{user.id}</span>
			</div>
			<div class="flex flex-col gap-1">
				<span class="text-xs uppercase text-gray-500 font-semibold tracking-wider">Email</span>
				<span class="font-medium text-gray-900 dark:text-gray-100">{user.email}</span>
			</div>
			
			<div class="flex flex-col gap-1">
				<span class="text-xs uppercase text-gray-500 font-semibold tracking-wider">Nombre Completo</span>
				<span class="font-medium text-gray-900 dark:text-gray-100">
					{user.profile?.first_name || 'N/D'} {user.profile?.last_name || ''}
				</span>
			</div>
			
			<div class="flex flex-col gap-1">
				<span class="text-xs uppercase text-gray-500 font-semibold tracking-wider">Rol de Sistema</span>
				<span class="font-medium">
					<span class="{user.roles?.[0]?.name === 'admin' ? 'admin-badge' : 'admin-badge-system'}">
						{user.roles?.[0]?.name || 'Usuario'}
					</span>
				</span>
			</div>

			<div class="flex flex-col gap-1">
				<span class="text-xs uppercase text-gray-500 font-semibold tracking-wider">Celular</span>
				<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile?.phone || 'N/D'}</span>
			</div>
			
			<div class="flex flex-col gap-1">
				<span class="text-xs uppercase text-gray-500 font-semibold tracking-wider">Fecha Nacimiento</span>
				<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile?.date_of_birth || 'N/D'}</span>
			</div>

			{#if user.profile?.person_type}
				<div class="col-span-1 md:col-span-2 border-t pt-3 mt-1 border-gray-200 dark:border-gray-700">
					<span class="text-xs mb-2 block uppercase text-gray-500 font-semibold tracking-wider">Información Fiscal (DTE)</span>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="flex flex-col gap-1">
							<span class="text-xs text-gray-400">Tipo de Persona</span>
							<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile.person_type}</span>
						</div>
						
						<div class="flex flex-col gap-1">
							<span class="text-xs text-gray-400">DUI</span>
							<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile.dui || 'N/D'}</span>
						</div>
						
						{#if user.profile.person_type === 'Juridica'}
							<div class="flex flex-col gap-1">
								<span class="text-xs text-gray-400">NIT</span>
								<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile.nit || 'N/D'}</span>
							</div>
							<div class="flex flex-col gap-1">
								<span class="text-xs text-gray-400">NRC</span>
								<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile.nrc || 'N/D'}</span>
							</div>
							<div class="col-span-1 md:col-span-2 flex flex-col gap-1">
								<span class="text-xs text-gray-400">Actividad Económica</span>
								<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile.economic_activity || 'N/D'}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<div class="col-span-1 md:col-span-2 border-t pt-3 mt-1 border-gray-200 dark:border-gray-700">
				<span class="text-xs mb-2 block uppercase text-gray-500 font-semibold tracking-wider">Datos GeoGráficos</span>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="flex flex-col gap-1">
						<span class="text-xs text-gray-400">País</span>
						<span class="font-medium text-gray-900 dark:text-gray-100">{getCountryName(user.profile?.country)}</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-gray-400">Departamento</span>
						<span class="font-medium text-gray-900 dark:text-gray-100">{getDeptName(user.profile?.country, user.profile?.department)}</span>
					</div>
					<div class="flex flex-col gap-1">
						<span class="text-xs text-gray-400">Municipio</span>
						<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile?.municipality || 'N/D'}</span>
					</div>
				</div>
			</div>

			<div class="col-span-1 md:col-span-2 flex flex-col gap-1 bg-white p-3 rounded border border-gray-100 shadow-sm dark:bg-gray-900 dark:border-none mt-2">
				<span class="text-xs uppercase text-gray-500 font-semibold tracking-wider">Complemento Dirección</span>
				<span class="font-medium text-gray-900 dark:text-gray-100">{user.profile?.address_complement || 'No especificado'}</span>
			</div>
		</div>

		<div class="admin-modal-actions border-t pt-4">
			<button type="button" class="admin-btn" onclick={onClose} style="width: 100%;">
				Cerrar Detalles
			</button>
		</div>
	</div>
</div>
