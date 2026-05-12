<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { 
		fetchNotificationSettings, 
		updateNotificationSetting,
		fetchRoles,
		type NotificationSettingRead,
		type RoleRead 
	} from '$lib/services/admin.service';
	import { toast } from '$lib/stores/toast.svelte';
	import '../../admin/adminPage.css';
	import { 
		Bell, CreditCard, BadgeDollarSign, CalendarDays, 
		BellRing, CheckCircle2, XCircle, AlertOctagon, Users, Settings2, Save,
		Power, History, ChevronRight, X,
		Mail, Globe, Clock, Lock, ShieldCheck, Database
	} from 'lucide-svelte';

	let settings = $state<NotificationSettingRead[]>([]);
	let availableRoles = $state<RoleRead[]>([]);
	let loading = $state(true);
	let savingKey = $state<string | null>(null);
	let showRolesModal = $state(false);

	// Diccionario para dar UX a las llaves técnicas de la BD
	const SETTINGS_META: Record<string, any> = {
		notifications_enabled: {
			title: 'Sistema de Notificaciones',
			desc: 'Interruptor global principal para habilitar o deshabilitar todas las notificaciones',
			icon: Power
		},
		notify_client_payment_received: {
			title: 'Pagos al Cliente',
			desc: 'Notificar al cliente cuando se registre un pago a su favor',
			icon: CreditCard
		},
		notify_admin_payment_received: {
			title: 'Pagos a la Administración',
			desc: 'Enviar alerta global cuando se registre un pago de cualquier cliente',
			icon: BadgeDollarSign
		},
		notify_client_reservation_created: {
			title: 'Creación al Cliente',
			desc: 'Enviar resumen al cliente cuando cree una reserva',
			icon: CalendarDays
		},
		notify_admin_new_reservation: {
			title: 'Creación a la Administración',
			desc: 'Alertar al staff cuando ingrese una nueva reserva al sistema',
			icon: BellRing
		},
		notify_client_reservation_confirmed: {
			title: 'Confirmación al Cliente',
			desc: 'Notificar cuando la reserva alcance el monto total y sea confirmada',
			icon: CheckCircle2
		},
		notify_client_reservation_cancelled: {
			title: 'Cancelación al Cliente',
			desc: 'Notificar si la administración anula la reservación',
			icon: XCircle
		},
		notify_admin_reservation_cancelled: {
			title: 'Cancelación a la Administración',
			desc: 'Alertar a gerentes/editores si una reserva es cancelada',
			icon: AlertOctagon
		},
		admin_notification_roles: {
			title: 'Roles de Recepción (Staff)',
			desc: 'Selecciona los roles que recibirán las alertas del sistema',
			icon: Users,
			type: 'roles_multi_select'
		},
		notification_retention_days: {
			title: 'Retención de Historial',
			desc: 'Cantidad de días que se guardarán las notificaciones en la base de datos',
			icon: History,
			type: 'mixed_number',
			placeholder: 'Ej: 90'
		}
	};

	onMount(async () => {
		try {
			const [settingsRes, rolesRes] = await Promise.all([
				fetchNotificationSettings(),
				fetchRoles()
			]);
			settings = settingsRes;
			availableRoles = rolesRes;
		} catch (error: any) {
			toast.error(error.message || 'Error al cargar datos');
		} finally {
			loading = false;
		}
	});

	async function toggleBooleanSetting(setting: NotificationSettingRead, meta: any) {
		const isCurrentlyOn = meta.type === 'mixed_number' ? setting.value !== 'false' : setting.value === 'true';
		const newValue = isCurrentlyOn ? 'false' : (meta.type === 'mixed_number' ? '90' : 'true');
		
		const originalValue = setting.value;
		
		// Optimistic UI update
		setting.value = newValue;
		
		savingKey = setting.key;
		try {
			await updateNotificationSetting(setting.key, newValue);
			toast.success('Configuración actualizada exitosamente');
		} catch (err: any) {
			// Revert on error
			setting.value = originalValue;
			toast.error(err.message || 'No se pudo guardar la configuración');
		} finally {
			savingKey = null;
		}
	}

	async function toggleRoleInSetting(setting: NotificationSettingRead, roleName: string) {
		const currentRoles = setting.value ? setting.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
		const rName = roleName.toLowerCase();
		
		let newRoles;
		if (currentRoles.includes(rName)) {
			newRoles = currentRoles.filter(r => r !== rName);
		} else {
			newRoles = [...currentRoles, rName];
		}
		
		const newValue = newRoles.join(',');
		if (newValue === '') {
			toast.error('Debe haber al menos un rol para recibir notificaciones');
			return;
		}

		const originalValue = setting.value;
		setting.value = newValue;
		
		savingKey = setting.key;
		try {
			await updateNotificationSetting(setting.key, newValue);
			toast.success(`Roles actualizados`);
		} catch (err: any) {
			setting.value = originalValue;
			toast.error(err.message || 'No se pudo actualizar los roles');
		} finally {
			savingKey = null;
		}
	}

	async function saveTextSetting(setting: NotificationSettingRead) {
		if (setting.value == null || String(setting.value).trim() === '') {
			toast.error('El campo no puede estar vacío');
			return;
		}

		savingKey = setting.key;
		try {
			await updateNotificationSetting(setting.key, setting.value);
			toast.success('Configuración guardada exitosamente');
		} catch (err: any) {
			toast.error(err.message || 'Error al guardar la configuración');
		} finally {
			savingKey = null;
		}
	}
</script>

<svelte:head>
	<title>Configuración | AFE Resort Admin</title>
</svelte:head>

<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title flex items-center gap-3">
				<Settings2 class="w-8 h-8 text-[#D4AF37]" />
				Configuración del Sistema
			</h1>
			<p class="admin-desc">Gestión de parámetros globales, notificaciones y reglas de negocio.</p>
		</div>
	</div>

	<div class="admin-section">
		{#if loading}
			<div class="flex justify-center items-center py-20" in:fade>
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
			</div>
		{:else}
			<div class="space-y-10" in:fade>
				<!-- Sección: Centro de Notificaciones -->
				<section>
					<div class="flex items-center gap-3 mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
						<Bell class="w-6 h-6 text-[#D4AF37]" />
						<h2 class="text-xl font-['Outfit'] font-semibold text-slate-900 dark:text-white">
							Alertas y Notificaciones
						</h2>
					</div>
					
					<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
						{#each settings as setting (setting.id)}
							{@const meta = SETTINGS_META[setting.key] || { title: setting.key, desc: setting.description, type: 'boolean', icon: Settings2 }}
							
							<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
								<!-- Deco accent -->
								<div class="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-[#D4AF37] transition-colors duration-300"></div>
								
								<div class="flex items-start justify-between gap-4">
									<div class="flex items-start gap-4 flex-1 min-w-0">
										<div class="flex-shrink-0 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-gray-500 dark:text-gray-400">
											<svelte:component this={meta.icon} class="w-6 h-6" />
										</div>
										<div class="flex-1 min-w-0 pt-1">
											<h3 class="truncate text-[1.05rem] font-semibold text-slate-900 dark:text-gray-100 mb-1 leading-tight">
												{meta.title}
											</h3>
											<p class="text-sm text-gray-500 dark:text-gray-400 leading-snug line-clamp-2">
												{meta.desc}
											</p>
										</div>
									</div>

									<div class="flex-shrink-0 pt-1.5 pr-2">
										{#if meta.type !== 'text' && meta.type !== 'roles_multi_select'}
											{@const isToggledOn = meta.type === 'mixed_number' ? setting.value !== 'false' : setting.value === 'true'}
											<!-- Boolean Toggle -->
											<button 
												type="button" 
												class="relative inline-flex h-6 w-11 items-center flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 {isToggledOn ? 'bg-[#D4AF37]' : 'bg-gray-300 dark:bg-gray-700'} {savingKey === setting.key ? 'opacity-50 cursor-wait' : ''}"
												role="switch" 
												aria-checked={isToggledOn}
												onclick={() => toggleBooleanSetting(setting, meta)}
												disabled={savingKey === setting.key}
											>
												<span 
													aria-hidden="true" 
													class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {isToggledOn ? 'translate-x-[22px]' : 'translate-x-[2px]'}"
												></span>
											</button>
										{/if}
									</div>
								</div>

								<!-- Text Input Extension -->
								{#if meta.type === 'text' || (meta.type === 'mixed_number' && setting.value !== 'false')}
									<div class="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800" transition:slide>
										<div class="flex items-center gap-3">
											<input 
												type={meta.type === 'mixed_number' ? 'number' : 'text'} 
												bind:value={setting.value} 
												class="flex-1 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37] block w-full p-2.5 transition-colors"
												placeholder={meta.placeholder || 'Escribe aquí...'}
												min={meta.type === 'mixed_number' ? "1" : undefined}
											/>
											<button 
												onclick={() => saveTextSetting(setting)}
												disabled={savingKey === setting.key}
												class="p-2.5 bg-[#1a1a1a] dark:bg-gray-700 text-white rounded-lg hover:bg-[#D4AF37] dark:hover:bg-[#D4AF37] transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
												title="Guardar Valor"
											>
												{#if savingKey === setting.key}
													<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
												{:else}
													<Save class="w-5 h-5" />
												{/if}
											</button>
										</div>
									</div>
								{/if}

								<!-- Roles Multi Select Summary -->
								{#if meta.type === 'roles_multi_select'}
									<div class="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800" transition:slide>
										<div class="flex items-center justify-between gap-3">
											<div class="flex-1 min-w-0">
												<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
													Destinatarios Actuales
												</p>
												<div class="flex flex-wrap gap-1.5">
													{#each (setting.value?.split(',') || []) as roleName}
														<span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-[10px] font-medium border border-gray-200 dark:border-gray-700">
															{roleName.trim()}
														</span>
													{/each}
												</div>
											</div>
											<button 
												onclick={() => showRolesModal = true}
												class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-[#D4AF37]"
												title="Configurar Roles"
											>
												<ChevronRight class="w-5 h-5" />
											</button>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>

				<!-- Sección Mockup: Servidor de Correo -->
				<section class="opacity-60 grayscale-[0.5]">
					<div class="flex items-center justify-between mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
						<div class="flex items-center gap-3">
							<Mail class="w-6 h-6 text-gray-400" />
							<h2 class="text-xl font-['Outfit'] font-semibold text-slate-900 dark:text-white">
								Servicio de Correo (SMTP)
							</h2>
						</div>
						<span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold uppercase rounded tracking-widest">Próximamente</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
							<div class="flex items-center gap-3 mb-4 text-gray-400">
								<Globe class="w-5 h-5" />
								<span class="text-sm font-bold uppercase tracking-wider">Host SMTP</span>
							</div>
							<input type="text" value="smtp.resort.com" disabled class="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm text-gray-400 cursor-not-allowed" />
						</div>

						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
							<div class="flex items-center gap-3 mb-4 text-gray-400">
								<Lock class="w-5 h-5" />
								<span class="text-sm font-bold uppercase tracking-wider">API Key / Password</span>
							</div>
							<input type="password" value="********" disabled class="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm text-gray-400 cursor-not-allowed" />
						</div>

						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
							<div class="flex items-center gap-3 mb-4 text-gray-400">
								<ShieldCheck class="w-5 h-5" />
								<span class="text-sm font-bold uppercase tracking-wider">Puerto / Seguridad</span>
							</div>
							<div class="flex gap-2">
								<span class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">587</span>
								<span class="px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded text-xs">STARTTLS</span>
							</div>
						</div>
					</div>
				</section>

				<!-- Sección Mockup: Parámetros de Negocio -->
				<section class="opacity-60 grayscale-[0.5]">
					<div class="flex items-center justify-between mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
						<div class="flex items-center gap-3">
							<Clock class="w-6 h-6 text-gray-400" />
							<h2 class="text-xl font-['Outfit'] font-semibold text-slate-900 dark:text-white">
								Políticas y Parámetros
							</h2>
						</div>
						<span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold uppercase rounded tracking-widest">Próximamente</span>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
							<h3 class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase">Horarios de Estancia</h3>
							<div class="space-y-3">
								<div class="flex justify-between items-center text-sm">
									<span class="text-gray-500">Check-in estándar</span>
									<span class="font-mono text-[#D4AF37]">15:00</span>
								</div>
								<div class="flex justify-between items-center text-sm">
									<span class="text-gray-500">Check-out estándar</span>
									<span class="font-mono text-[#D4AF37]">11:00</span>
								</div>
							</div>
						</div>

						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
							<h3 class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase">Impuestos y Tasas</h3>
							<div class="space-y-3">
								<div class="flex justify-between items-center text-sm">
									<span class="text-gray-500">IVA Aplicable</span>
									<span class="font-bold">13.00%</span>
								</div>
								<div class="flex justify-between items-center text-sm">
									<span class="text-gray-500">Tasa Municipal</span>
									<span class="font-bold">5.00%</span>
								</div>
							</div>
						</div>

						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
							<h3 class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase">Mantenimiento</h3>
							<button class="w-full py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed">
								<Database class="w-4 h-4" />
								Optimizar Base de Datos
							</button>
						</div>
					</div>
				</section>
			</div>
		{/if}
	</div>
</div>

<!-- Modal de Selección de Roles -->
{#if showRolesModal}
	{@const setting = settings.find(s => s.key === 'admin_notification_roles')}
	{#if setting}
		<div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" transition:fade>
			<div class="bg-white dark:bg-[#11151d] w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden" transition:slide>
				<div class="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
					<div class="flex items-center gap-3">
						<div class="p-2 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37]">
							<Users class="w-5 h-5" />
						</div>
						<div>
							<h2 class="text-lg font-bold text-slate-900 dark:text-white">Roles de Staff</h2>
							<p class="text-xs text-gray-500">¿Quiénes reciben notificaciones?</p>
						</div>
					</div>
					<button 
						onclick={() => showRolesModal = false}
						class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<div class="p-6">
					<div class="grid grid-cols-2 gap-3">
						{#each availableRoles as role (role.id)}
							{@const isSelected = setting.value ? setting.value.split(',').map(s => s.trim().toLowerCase()).includes(role.name.toLowerCase()) : false}
							<button
								type="button"
								onclick={() => toggleRoleInSetting(setting, role.name)}
								disabled={savingKey === setting.key}
								class="flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left {isSelected ? 'bg-[#D4AF37]/5 border-[#D4AF37] text-[#D4AF37]' : 'bg-gray-50 dark:bg-gray-800/50 border-transparent text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'} {savingKey === setting.key ? 'opacity-50 cursor-wait' : ''}"
							>
								<div class="w-5 h-5 rounded-md border-2 flex items-center justify-center {isSelected ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-300 dark:border-gray-600'}">
									{#if isSelected}
										<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
									{/if}
								</div>
								<span class="text-sm font-semibold">{role.name}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="p-6 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
					<button 
						onclick={() => showRolesModal = false}
						class="w-full py-3 bg-[#1a1a1a] dark:bg-[#D4AF37] text-white rounded-2xl font-bold hover:opacity-90 transition-opacity shadow-lg"
					>
						Listo
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
