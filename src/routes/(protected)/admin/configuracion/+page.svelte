<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import { 
		fetchNotificationSettings, 
		updateNotificationSetting,
		fetchRoles,
		fetchSystemSettings,
		bulkUpdateSystemSettings,
		type NotificationSettingRead,
		type SystemSettingRead,
		type RoleRead 
	} from '$lib/services/admin.service';
	import { toast } from '$lib/stores/toast.svelte';
	import '../../admin/adminPage.css';
	import { 
		Bell, CreditCard, BadgeDollarSign, CalendarDays, 
		BellRing, CheckCircle2, XCircle, AlertOctagon, Users, Settings2, Save,
		Power, History, ChevronRight, X, Info,
		Globe, Clock, ShieldCheck, HeartHandshake, Hotel, Percent, Sparkles,
		Upload, Trash2, ArrowLeft, ArrowRight, RotateCcw, Plus, Image, Loader2
	} from 'lucide-svelte';
	import { getPublicAmenities, uploadRoomImage, getAdminRooms, type AmenityRead, type RoomRead } from '$lib/services/room.service';
	import AmenityIcon from '$lib/components/ui/AmenityIcon.svelte';

	// Tab seleccionada
	let activeTab = $state<'notificaciones' | 'politicas' | 'hotel' | 'catalogo' | 'contenido_web'>('notificaciones');

	// Catálogo y filtros dinámicos
	let amenities = $state<AmenityRead[]>([]);
	let selectedAmenityIds = $state<number[]>([]);
	let rooms = $state<RoomRead[]>([]);
	let selectedFeaturedRoomIds = $state<number[]>([]);
	let faqsList = $state<Array<{ question: string; answer: string }>>([]);


	// Alertas y notificaciones
	let settings = $state<NotificationSettingRead[]>([]);
	let availableRoles = $state<RoleRead[]>([]);
	let savingKey = $state<string | null>(null);
	let showRolesModal = $state(false);

	// Configuración del sistema
	let systemSettings = $state<SystemSettingRead[]>([]);
	let form = $state<Record<string, string>>({});
	let isSavingGroup = $state<Record<string, boolean>>({});

	// Estados generales
	let loading = $state(true);

	// Diccionario para dar UX a las llaves técnicas de las notificaciones
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
			const [settingsRes, rolesRes, sysRes, amenitiesRes, roomsRes] = await Promise.all([
				fetchNotificationSettings(),
				fetchRoles(),
				fetchSystemSettings(),
				getPublicAmenities(),
				getAdminRooms()
			]);
			settings = settingsRes;
			availableRoles = rolesRes;
			systemSettings = sysRes;
			amenities = amenitiesRes;
			rooms = (roomsRes || []).filter(r => !r.is_deleted && r.is_active);

			// Rellenar formulario reactivo
			sysRes.forEach(s => {
				form[s.key] = s.value;
			});

			const filtersVal = sysRes.find(s => s.key === 'featured_amenity_filters')?.value || '';
			selectedAmenityIds = filtersVal ? filtersVal.split(',').map(Number).filter(Boolean) : [];

			const featuredVal = sysRes.find(s => s.key === 'featured_rooms_home')?.value || '';
			selectedFeaturedRoomIds = featuredVal ? featuredVal.split(',').map(Number).filter(Boolean) : [];

			const faqVal = sysRes.find(s => s.key === 'faq_items_json')?.value || '[]';
			try {
				faqsList = JSON.parse(faqVal);
			} catch (e) {
				faqsList = [];
			}
		} catch (error: any) {
			toast.error(error.message || 'Error al cargar datos de configuración');
		} finally {
			loading = false;
		}
	});

	function toggleAmenityFilter(id: number) {
		if (selectedAmenityIds.includes(id)) {
			selectedAmenityIds = selectedAmenityIds.filter(x => x !== id);
		} else {
			selectedAmenityIds = [...selectedAmenityIds, id];
		}
	}

	async function saveAmenityFilters() {
		isSavingGroup['catalogo'] = true;
		try {
			const value = selectedAmenityIds.join(',');
			await bulkUpdateSystemSettings({
				featured_amenity_filters: value
			});
			form['featured_amenity_filters'] = value;
			toast.success('Filtros del catálogo guardados correctamente');
		} catch (err: any) {
			toast.error(err.message || 'Error al guardar los filtros');
		} finally {
			isSavingGroup['catalogo'] = false;
		}
	}

	function toggleFeaturedRoom(id: number) {
		if (selectedFeaturedRoomIds.includes(id)) {
			selectedFeaturedRoomIds = selectedFeaturedRoomIds.filter(x => x !== id);
		} else {
			if (selectedFeaturedRoomIds.length >= 3) {
				toast.error('Solo puedes seleccionar un máximo de 3 suites destacadas');
				return;
			}
			selectedFeaturedRoomIds = [...selectedFeaturedRoomIds, id];
		}
	}

	async function saveFeaturedRooms() {
		isSavingGroup['featured_rooms'] = true;
		try {
			const value = selectedFeaturedRoomIds.join(',');
			await bulkUpdateSystemSettings({
				featured_rooms_home: value
			});
			form['featured_rooms_home'] = value;
			toast.success('Suites destacadas de la página de inicio guardadas correctamente');
		} catch (err: any) {
			toast.error(err.message || 'Error al guardar las suites destacadas');
		} finally {
			isSavingGroup['featured_rooms'] = false;
		}
	}

	async function saveHeroImages() {
		isSavingGroup['hero_images'] = true;
		try {
			await bulkUpdateSystemSettings({
				hero_image_reservations: form['hero_image_reservations'] || '',
				hero_images_rooms: form['hero_images_rooms'] || ''
			});
			toast.success('Imágenes del portal público guardadas correctamente');
		} catch (err: any) {
			toast.error(err.message || 'Error al guardar las imágenes');
		} finally {
			isSavingGroup['hero_images'] = false;
		}
	}

	// Reactividad para el carrusel de imágenes de habitaciones
	let roomsImagesList = $derived.by(() => {
		const raw = form['hero_images_rooms'] || '';
		return raw.split(',').map(s => s.trim()).filter(Boolean);
	});

	function addRoomImage(url: string) {
		const current = [...roomsImagesList];
		current.push(url);
		form['hero_images_rooms'] = current.join(',');
	}

	function removeRoomImage(index: number) {
		const current = [...roomsImagesList];
		current.splice(index, 1);
		form['hero_images_rooms'] = current.join(',');
	}

	function moveRoomImage(index: number, direction: 'left' | 'right') {
		const current = [...roomsImagesList];
		if (direction === 'left' && index > 0) {
			const temp = current[index];
			current[index] = current[index - 1];
			current[index - 1] = temp;
		} else if (direction === 'right' && index < current.length - 1) {
			const temp = current[index];
			current[index] = current[index + 1];
			current[index + 1] = temp;
		}
		form['hero_images_rooms'] = current.join(',');
	}

	// --- Lógica del CRUD de Preguntas Frecuentes (FAQ) ---
	function addFaqItem() {
		faqsList = [...faqsList, { question: '', answer: '' }];
	}

	function removeFaqItem(index: number) {
		faqsList = faqsList.filter((_, i) => i !== index);
	}

	function moveFaqItem(index: number, direction: 'up' | 'down') {
		const current = [...faqsList];
		if (direction === 'up' && index > 0) {
			const temp = current[index];
			current[index] = current[index - 1];
			current[index - 1] = temp;
		} else if (direction === 'down' && index < current.length - 1) {
			const temp = current[index];
			current[index] = current[index + 1];
			current[index + 1] = temp;
		}
		faqsList = current;
	}


	// Estados de carga y referencias de archivos
	let uploadingReservations = $state(false);
	let uploadingRooms = $state(false);

	async function handleReservationsUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		uploadingReservations = true;
		try {
			const res = await uploadRoomImage(input.files[0]);
			form['hero_image_reservations'] = res.url;
			toast.success('Imagen de reservaciones subida a Cloudinary');
		} catch (err: any) {
			toast.error(err.message || 'Error al subir la imagen');
		} finally {
			uploadingReservations = false;
			input.value = ''; // reset
		}
	}

	async function handleRoomsUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		uploadingRooms = true;
		try {
			const res = await uploadRoomImage(input.files[0]);
			addRoomImage(res.url);
			toast.success('Imagen agregada al carrusel');
		} catch (err: any) {
			toast.error(err.message || 'Error al subir la imagen');
		} finally {
			uploadingRooms = false;
			input.value = ''; // reset
		}
	}

	function resetReservationsHero() {
		form['hero_image_reservations'] = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop';
		toast.info('Restablecido a la imagen de reservas predeterminada');
	}

	function resetRoomsHero() {
		form['hero_images_rooms'] = 'https://images.unsplash.com/photo-1611043704267-e67464e2351c?auto=format&fit=crop&w=1920&q=80,https://plus.unsplash.com/premium_photo-1682913629540-3857602b540c?auto=format&fit=crop&w=1920&q=80,https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1920&q=80,https://images.unsplash.com/photo-1578458329607-534298aebc4d?auto=format&fit=crop&w=1920&q=80';
		toast.info('Restablecido a las imágenes de carrusel predeterminadas');
	}

	let newRoomImageUrl = $state('');
	function addRoomImageManually() {
		if (!newRoomImageUrl.trim()) return;
		addRoomImage(newRoomImageUrl.trim());
		newRoomImageUrl = '';
		toast.success('Imagen agregada manualmente');
	}

	// --- Lógica de la pestaña de Notificaciones (Mantener intacta) ---
	async function toggleBooleanSetting(setting: NotificationSettingRead, meta: any) {
		const isCurrentlyOn = meta.type === 'mixed_number' ? setting.value !== 'false' : setting.value === 'true';
		const newValue = isCurrentlyOn ? 'false' : (meta.type === 'mixed_number' ? '90' : 'true');
		
		const originalValue = setting.value;
		setting.value = newValue;
		
		savingKey = setting.key;
		try {
			await updateNotificationSetting(setting.key, newValue);
			toast.success('Configuración actualizada exitosamente');
		} catch (err: any) {
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
			toast.success(`Roles destinatarios actualizados`);
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

	// --- Lógica para guardar grupos de configuraciones generales ---
	async function saveSettingsGroup(groupName: string, keys: string[]) {
		isSavingGroup[groupName] = true;
		try {
			const payload: Record<string, string> = {};
			keys.forEach(k => {
				payload[k] = form[k] != null ? String(form[k]) : '';
			});
			
			// Validaciones del lado del cliente
			if (keys.includes('tax_iva_rate')) {
				const iva = parseFloat(payload['tax_iva_rate']);
				const tourism = parseFloat(payload['tax_tourism_rate']);
				if (isNaN(iva) || iva < 0 || iva > 100 || isNaN(tourism) || tourism < 0 || tourism > 100) {
					throw new Error('Los porcentajes de impuestos deben estar entre 0% y 100%');
				}
			}

			if (keys.includes('cancellation_same_day_penalty')) {
				const sameDay = parseFloat(payload['cancellation_same_day_penalty']);
				const shortPenalty = parseFloat(payload['cancellation_short_notice_penalty']);
				const shortDays = parseInt(payload['cancellation_short_notice_days']);
				if (isNaN(sameDay) || sameDay < 0 || sameDay > 100 || isNaN(shortPenalty) || shortPenalty < 0 || shortPenalty > 100) {
					throw new Error('Las penalidades de cancelación deben estar entre 0% y 100%');
				}
				if (isNaN(shortDays) || shortDays < 0) {
					throw new Error('El umbral de días de aviso corto debe ser un número entero positivo');
				}
			}

			if (keys.includes('pending_reservation_timeout_hours')) {
				const timeout = parseInt(payload['pending_reservation_timeout_hours']);
				const maxStay = parseInt(payload['max_stay_nights']);
				const minAdvance = parseInt(payload['min_advance_booking_days']);
				if (isNaN(timeout) || timeout <= 0) {
					throw new Error('El tiempo límite para pagar la reservación debe ser superior a 0 horas');
				}
				if (isNaN(maxStay) || maxStay <= 0) {
					throw new Error('El límite máximo de estancia debe ser superior a 0 noches');
				}
				if (isNaN(minAdvance) || minAdvance < 0) {
					throw new Error('Los días de anticipación mínimos para reservar no pueden ser negativos');
				}
			}

			if (keys.includes('hotel_email') && payload['hotel_email']) {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(payload['hotel_email'])) {
					throw new Error('Dirección de correo electrónico del hotel inválida');
				}
			}

			await bulkUpdateSystemSettings(payload);
			toast.success('Configuraciones guardadas correctamente');
		} catch (err: any) {
			toast.error(err.message || 'Error al guardar las configuraciones');
		} finally {
			isSavingGroup[groupName] = false;
		}
	}

	// --- Lógica de la pestaña Contenido Web ---
	let uploadingEsenciaMain = $state(false);
	let uploadingEsenciaSecondary = $state(false);
	let uploadingAmenity1 = $state(false);
	let uploadingAmenity2 = $state(false);
	let uploadingAmenity3 = $state(false);
	let uploadingMomentosImg = $state(false);

	async function handleImageUpload(
		e: Event, 
		formKey: string, 
		loaderKey: 'esencia_main' | 'esencia_secondary' | 'amenity1' | 'amenity2' | 'amenity3' | 'momentos_img'
	) {
		const input = e.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		
		if (loaderKey === 'esencia_main') uploadingEsenciaMain = true;
		else if (loaderKey === 'esencia_secondary') uploadingEsenciaSecondary = true;
		else if (loaderKey === 'amenity1') uploadingAmenity1 = true;
		else if (loaderKey === 'amenity2') uploadingAmenity2 = true;
		else if (loaderKey === 'amenity3') uploadingAmenity3 = true;
		else if (loaderKey === 'momentos_img') uploadingMomentosImg = true;

		try {
			const res = await uploadRoomImage(input.files[0]);
			form[formKey] = res.url;
			toast.success('Imagen subida correctamente a Cloudinary');
		} catch (err: any) {
			toast.error(err.message || 'Error al subir la imagen');
		} finally {
			if (loaderKey === 'esencia_main') uploadingEsenciaMain = false;
			else if (loaderKey === 'esencia_secondary') uploadingEsenciaSecondary = false;
			else if (loaderKey === 'amenity1') uploadingAmenity1 = false;
			else if (loaderKey === 'amenity2') uploadingAmenity2 = false;
			else if (loaderKey === 'amenity3') uploadingAmenity3 = false;
			else if (loaderKey === 'momentos_img') uploadingMomentosImg = false;
			input.value = ''; // reset
		}
	}

	async function saveWebContent() {
		isSavingGroup['contenido_web'] = true;
		try {
			const keys = [
				'hero_title', 'hero_subtitle', 'hero_video_url',
				'esencia_img_main', 'esencia_img_secondary',
				'amenity_sig_1_img', 'amenity_sig_1_title', 'amenity_sig_1_desc',
				'amenity_sig_2_img', 'amenity_sig_2_title', 'amenity_sig_2_desc',
				'amenity_sig_3_img', 'amenity_sig_3_title', 'amenity_sig_3_desc',
				'momentos_video_url', 'momentos_img_url',
				'social_instagram', 'social_twitter', 'social_facebook',
				'map_address', 'map_phone', 'map_email', 'map_hours', 'map_iframe_url',
				'faq_items_json'
			];

			// Limpiar y serializar FAQs antes del bulk save
			const cleanFaqs = faqsList.filter(f => f.question.trim() || f.answer.trim());
			form['faq_items_json'] = JSON.stringify(cleanFaqs);

			const payload: Record<string, string> = {};
			keys.forEach(k => {
				payload[k] = form[k] != null ? String(form[k]) : '';
			});

			await bulkUpdateSystemSettings(payload);
			toast.success('Contenido del portal guardado correctamente');
		} catch (err: any) {
			toast.error(err.message || 'Error al guardar el contenido web');
		} finally {
			isSavingGroup['contenido_web'] = false;
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
			<p class="admin-desc">Gestión de parámetros globales, notificaciones y reglas de negocio del establecimiento.</p>
		</div>
	</div>

	<!-- Hermoso Tab bar al estilo Glassmorphic -->
	<div class="flex border-b border-gray-200 dark:border-gray-800 mb-8 w-full overflow-x-auto whitespace-nowrap">
		<button 
			onclick={() => activeTab = 'notificaciones'} 
			class="flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-['Outfit'] font-semibold text-sm transition-all focus:outline-none {activeTab === 'notificaciones' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-gray-200'}"
		>
			<Bell class="w-4 h-4" />
			Alertas y Notificaciones
		</button>
		
		<button 
			onclick={() => activeTab = 'politicas'} 
			class="flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-['Outfit'] font-semibold text-sm transition-all focus:outline-none {activeTab === 'politicas' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-gray-200'}"
		>
			<Clock class="w-4 h-4" />
			Políticas y Parámetros
		</button>

		<button 
			onclick={() => activeTab = 'hotel'} 
			class="flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-['Outfit'] font-semibold text-sm transition-all focus:outline-none {activeTab === 'hotel' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-gray-200'}"
		>
			<Hotel class="w-4 h-4" />
			Información del Hotel
		</button>

		<button 
			onclick={() => activeTab = 'catalogo'} 
			class="flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-['Outfit'] font-semibold text-sm transition-all focus:outline-none {activeTab === 'catalogo' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-gray-200'}"
		>
			<Sparkles class="w-4 h-4" />
			Catálogo Público
		</button>

		<button 
			onclick={() => activeTab = 'contenido_web'} 
			class="flex items-center gap-2.5 px-6 py-3.5 border-b-2 font-['Outfit'] font-semibold text-sm transition-all focus:outline-none {activeTab === 'contenido_web' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-gray-200'}"
		>
			<Globe class="w-4 h-4" />
			Contenido Web
		</button>
	</div>

	<div class="admin-section">
		{#if loading}
			<div class="flex justify-center items-center py-20" in:fade>
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
			</div>
		{:else}
			<div class="space-y-10" in:fade>
				
				<!-- TAB 1: NOTIFICACIONES (100% FUNCIONAL Y MANTENIDO) -->
				{#if activeTab === 'notificaciones'}
					<div class="space-y-6" in:fade={{ duration: 150 }}>
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
					</div>
				{/if}

				<!-- TAB 2: POLÍTICAS Y PARÁMETROS DE NEGOCIO (REALMENTE COMPLETO Y FUNCIONAL) -->
				{#if activeTab === 'politicas'}
					<div class="space-y-10" in:fade={{ duration: 150 }}>
						
						<!-- Horarios e Impuestos -->
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<!-- Sub-sección: Horarios de Estancia -->
							<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
								<div>
									<div class="flex items-center gap-3 mb-6">
										<div class="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
											<Clock class="w-5 h-5" />
										</div>
										<div>
											<h3 class="text-[1.1rem] font-bold text-slate-900 dark:text-white leading-tight">Horarios de Estancia</h3>
											<p class="text-xs text-gray-400">Horarios preestablecidos de check-in y check-out.</p>
										</div>
									</div>

									<div class="space-y-4">
										<div>
											<label for="checkin_time" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Check-in estándar</label>
											<input 
												id="checkin_time"
												type="time" 
												bind:value={form.checkin_time} 
												class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-mono"
											/>
										</div>

										<div>
											<label for="checkout_time" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Check-out estándar</label>
											<input 
												id="checkout_time"
												type="time" 
												bind:value={form.checkout_time} 
												class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-mono"
											/>
										</div>
									</div>
								</div>

								<div class="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
									<button 
										onclick={() => saveSettingsGroup('schedule', ['checkin_time', 'checkout_time'])}
										disabled={isSavingGroup['schedule']}
										class="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
									>
										{#if isSavingGroup['schedule']}
											<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
											Guardando...
										{:else}
											<Save class="w-4 h-4" />
											Guardar Horarios
										{/if}
									</button>
								</div>
							</div>

							<!-- Sub-sección: Impuestos y Tasas -->
							<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
								<div>
									<div class="flex items-center gap-3 mb-6">
										<div class="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
											<Percent class="w-5 h-5" />
										</div>
										<div>
											<h3 class="text-[1.1rem] font-bold text-slate-900 dark:text-white leading-tight">Impuestos y Tasas Fiscales</h3>
											<p class="text-xs text-gray-400">Gravámenes estatales y municipales aplicables.</p>
										</div>
									</div>

									<div class="space-y-4">
										<div>
											<label for="tax_iva_rate" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Porcentaje de IVA (%)</label>
											<div class="relative">
												<input 
													id="tax_iva_rate"
													type="number" 
													step="0.01"
													min="0"
													max="100"
													bind:value={form.tax_iva_rate} 
													class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-10 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
												/>
												<span class="absolute right-3.5 top-3.5 text-gray-400 font-bold text-sm">%</span>
											</div>
										</div>

										<div>
											<label for="tax_tourism_rate" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tasa Municipal al Turismo (%)</label>
											<div class="relative">
												<input 
													id="tax_tourism_rate"
													type="number" 
													step="0.01"
													min="0"
													max="100"
													bind:value={form.tax_tourism_rate} 
													class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-10 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
												/>
												<span class="absolute right-3.5 top-3.5 text-gray-400 font-bold text-sm">%</span>
											</div>
										</div>
									</div>

									<!-- Alerta de impacto legal en cálculos fiscales -->
									<div class="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
										<Info class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
										<p class="text-xs text-amber-600 dark:text-amber-400 leading-snug">
											<strong>Nota legal:</strong> Las modificaciones en los porcentajes fiscales no afectarán a las reservaciones ya facturadas o agendadas; únicamente se aplicarán a transacciones de nueva creación.
										</p>
									</div>
								</div>

								<div class="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
									<button 
										onclick={() => saveSettingsGroup('taxes', ['tax_iva_rate', 'tax_tourism_rate'])}
										disabled={isSavingGroup['taxes']}
										class="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
									>
										{#if isSavingGroup['taxes']}
											<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
											Guardando...
										{:else}
											<Save class="w-4 h-4" />
											Guardar Impuestos
										{/if}
									</button>
								</div>
							</div>
						</div>

						<!-- Reglas de Cancelación y Reservas -->
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
							<!-- Sub-sección: Políticas de Cancelación -->
							<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
								<div>
									<div class="flex items-center gap-3 mb-6">
										<div class="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
											<HeartHandshake class="w-5 h-5" />
										</div>
										<div>
											<h3 class="text-[1.1rem] font-bold text-slate-900 dark:text-white leading-tight">Políticas de Cancelación y Reembolso</h3>
											<p class="text-xs text-gray-400">Penalidades aplicables por revocación unilateral.</p>
										</div>
									</div>

									<div class="space-y-4">
										<div>
											<label for="cancellation_same_day_penalty" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Penalidad por cancelación el mismo día (%)</label>
											<div class="relative">
												<input 
													id="cancellation_same_day_penalty"
													type="number" 
													min="0"
													max="100"
													bind:value={form.cancellation_same_day_penalty} 
													class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-10 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
												/>
												<span class="absolute right-3.5 top-3.5 text-gray-400 font-bold text-sm">%</span>
											</div>
											<p class="text-[11px] text-gray-400 mt-1">Porcentaje del depósito retenido si cancelan en la fecha de llegada.</p>
										</div>

										<div class="grid grid-cols-2 gap-4">
											<div>
												<label for="cancellation_short_notice_days" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Umbral aviso corto</label>
												<div class="relative">
													<input 
														id="cancellation_short_notice_days"
														type="number" 
														min="0"
														bind:value={form.cancellation_short_notice_days} 
														class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-12 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
													/>
													<span class="absolute right-3 top-3.5 text-gray-400 text-xs">días</span>
												</div>
											</div>
											<div>
												<label for="cancellation_short_notice_penalty" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Penalidad (%)</label>
												<div class="relative">
													<input 
														id="cancellation_short_notice_penalty"
														type="number" 
														min="0"
														max="100"
														bind:value={form.cancellation_short_notice_penalty} 
														class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-10 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
													/>
													<span class="absolute right-3.5 top-3.5 text-gray-400 font-bold text-sm">%</span>
												</div>
											</div>
										</div>
										<p class="text-[11px] text-gray-400 leading-tight">Si se cancela dentro del umbral de días configurado previo al check-in, se aplica el porcentaje de penalización adjunto.</p>
									</div>
								</div>

								<div class="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
									<button 
										onclick={() => saveSettingsGroup('cancellation', ['cancellation_same_day_penalty', 'cancellation_short_notice_days', 'cancellation_short_notice_penalty'])}
										disabled={isSavingGroup['cancellation']}
										class="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
									>
										{#if isSavingGroup['cancellation']}
											<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
											Guardando...
										{:else}
											<Save class="w-4 h-4" />
											Guardar Políticas
										{/if}
									</button>
								</div>
							</div>

							<!-- Sub-sección: Reglas de Reservaciones -->
							<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
								<div>
									<div class="flex items-center gap-3 mb-6">
										<div class="p-2.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl">
											<Sparkles class="w-5 h-5" />
										</div>
										<div>
											<h3 class="text-[1.1rem] font-bold text-slate-900 dark:text-white leading-tight">Reglas de Operación de Reservas</h3>
											<p class="text-xs text-gray-400">Parámetros clave de temporalidades y flujos.</p>
										</div>
									</div>

									<div class="space-y-4">
										<div>
											<label for="pending_reservation_timeout_hours" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expiración de reservas pendientes</label>
											<div class="relative">
												<input 
													id="pending_reservation_timeout_hours"
													type="number" 
													min="1"
													bind:value={form.pending_reservation_timeout_hours} 
													class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-14 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
												/>
												<span class="absolute right-3.5 top-3.5 text-gray-400 text-xs">horas</span>
											</div>
											<p class="text-[11px] text-gray-400 mt-1">Tiempo de gracia máximo para saldar el pago antes del auto-cancelado por el sistema.</p>
										</div>

										<div class="grid grid-cols-2 gap-4">
											<div>
												<label for="max_stay_nights" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estancia máxima</label>
												<div class="relative">
													<input 
														id="max_stay_nights"
														type="number" 
														min="1"
														bind:value={form.max_stay_nights} 
														class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-14 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
													/>
													<span class="absolute right-3 top-3.5 text-gray-400 text-xs">noches</span>
												</div>
											</div>
											<div>
												<label for="min_advance_booking_days" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Anticipación mínima</label>
												<div class="relative">
													<input 
														id="min_advance_booking_days"
														type="number" 
														min="0"
														bind:value={form.min_advance_booking_days} 
														class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 pr-12 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
													/>
													<span class="absolute right-3 top-3.5 text-gray-400 text-xs">días</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								<div class="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
									<button 
										onclick={() => saveSettingsGroup('reservations', ['pending_reservation_timeout_hours', 'max_stay_nights', 'min_advance_booking_days'])}
										disabled={isSavingGroup['reservations']}
										class="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
									>
										{#if isSavingGroup['reservations']}
											<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
											Guardando...
										{:else}
											<Save class="w-4 h-4" />
											Guardar Reglas
										{/if}
									</button>
								</div>
							</div>
						</div>

					</div>
				{/if}

				<!-- TAB 3: INFORMACIÓN DEL HOTEL (100% DINÁMICO Y VINCULADO AL backend Y PDF GENERATION) -->
				{#if activeTab === 'hotel'}
					<div class="space-y-6" in:fade={{ duration: 150 }}>
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-3xl mx-auto">
							<div class="flex items-center gap-4 mb-8">
								<div class="p-3.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Hotel class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-['Outfit'] font-bold text-slate-900 dark:text-white leading-tight">Información General del Hotel</h2>
									<p class="text-sm text-gray-400">Configuración de los metadatos de identidad del establecimiento empresarial.</p>
								</div>
							</div>

							<div class="space-y-5">
								<div>
									<label for="hotel_name" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Comercial del Establecimiento</label>
									<input 
										id="hotel_name"
										type="text" 
										bind:value={form.hotel_name} 
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3.5 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
										placeholder="Ej: AFE Resort & Spa"
									/>
									<p class="text-[11px] text-gray-400 mt-1">Este nombre se utilizará dinámicamente en los membretes de los reportes PDF, facturaciones, correos de confirmación y en el portal general.</p>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
									<div>
										<label for="hotel_phone" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono de Atención / Recepción</label>
										<input 
											id="hotel_phone"
											type="text" 
											bind:value={form.hotel_phone} 
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3.5 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
											placeholder="Ej: +503 2233-4455"
										/>
									</div>
									<div>
										<label for="hotel_email" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo de Contacto Oficial</label>
										<input 
											id="hotel_email"
											type="email" 
											bind:value={form.hotel_email} 
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3.5 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
											placeholder="Ej: reservas@afe-resort.com"
										/>
									</div>
								</div>

								<div>
									<label for="default_currency" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Moneda Oficial de Transacciones</label>
									<select 
										id="default_currency"
										bind:value={form.default_currency}
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3.5 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
									>
										<option value="USD">Dólar Estadounidense (USD - $)</option>
										<option value="EUR">Euro (EUR - €)</option>
									</select>
								</div>
							</div>

							<div class="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
								<button 
									onclick={() => saveSettingsGroup('hotel_info', ['hotel_name', 'hotel_phone', 'hotel_email', 'default_currency'])}
									disabled={isSavingGroup['hotel_info']}
									class="px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
								>
									{#if isSavingGroup['hotel_info']}
										<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
										Guardando Cambios...
									{:else}
										<Save class="w-4.5 h-4.5" />
										Guardar Identidad del Hotel
									{/if}
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- TAB 5: CONTENIDO WEB (PORTADA DINÁMICA) -->
				{#if activeTab === 'contenido_web'}
					<div class="space-y-10 font-['Outfit']" in:fade={{ duration: 150 }}>
						
						<!-- 1. HÉROE DE PORTADA -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
							<div class="flex items-center gap-4 mb-4">
								<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Globe class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">1. Hero (Sección de Entrada)</h2>
									<p class="text-sm text-gray-400">Modifica el gran título, subtítulo explicativo y el majestuoso video cinematográfico de fondo.</p>
								</div>
							</div>

							<div class="space-y-5">
								<div>
									<label for="hero_title" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título Principal del Hero</label>
									<input 
										id="hero_title"
										type="text" 
										bind:value={form.hero_title} 
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3.5 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
										placeholder="Ej: Lujo /sin/ concesiones."
									/>
									<p class="text-[10px] text-gray-400 mt-1">Usa barras diagonales <code>/</code> para envolver y destacar palabras en color dorado itálico. Ej: <code>Lujo /sin/ concesiones.</code> se renderizará con "sin" resaltado.</p>
								</div>

								<div>
									<label for="hero_subtitle" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subtítulo Descriptivo</label>
									<textarea 
										id="hero_subtitle"
										rows="3"
										bind:value={form.hero_subtitle} 
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3.5 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all"
										placeholder="Describe la experiencia de hospitalidad..."
									></textarea>
								</div>

								<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div class="space-y-4">
										<label for="hero_video_url" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Enlace de Video de Fondo (MP4 o similar)</label>
										<div class="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 rounded-xl">
											<Globe class="w-4.5 h-4.5 text-gray-400 mr-2 flex-shrink-0" />
											<input 
												id="hero_video_url"
												type="text" 
												bind:value={form.hero_video_url} 
												placeholder="Pega la URL de tu video cinematográfico en formato MP4..."
												class="flex-1 bg-transparent border-0 outline-none text-xs text-slate-900 dark:text-white focus:ring-0 focus:border-0 py-3.5 p-0 font-mono"
											/>
										</div>
										<p class="text-[10px] text-gray-400 mt-1">El video debe ser un enlace directo público (ej: /videos/hotel-hero-video2.mp4 o un enlace externo HTTPS).</p>
									</div>

									<div class="space-y-2">
										<span class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Previsualización del Video del Hero</span>
										<div class="relative aspect-video rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-center group shadow-sm">
											{#if form.hero_video_url}
												<!-- svelte-ignore a11y_media_has_caption -->
												<video 
													src={form.hero_video_url} 
													class="w-full h-full object-cover" 
													controls 
													muted 
													playsinline
													preload="metadata"
												></video>
												<div class="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 pointer-events-none transition-opacity group-hover:opacity-0">
													Preview
												</div>
											{:else}
												<div class="flex flex-col items-center gap-2 text-slate-400">
													<Globe class="w-8 h-8 opacity-40 animate-pulse" />
													<span class="text-xs">Sin enlace de video activo</span>
												</div>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- 2. NUESTRA ESENCIA -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-8">
							<div class="flex items-center gap-4">
								<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Image class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">2. Sección "Nuestra Esencia"</h2>
									<p class="text-sm text-gray-400">Gestiona las dos fotos artísticas superpuestas que ilustran el alma y arquitectura del hotel.</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
								<!-- Imagen Principal -->
								<div class="space-y-4">
									<span class="block text-xs font-bold text-slate-500 uppercase tracking-wider">A. Imagen Principal (Lado Izquierdo)</span>
									<div class="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 group">
										{#if form.esencia_img_main}
											<img src={form.esencia_img_main} alt="Esencia Main" class="w-full h-full object-cover transition-all group-hover:scale-103" />
										{:else}
											<div class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">Sin imagen configurada</div>
										{/if}

										{#if uploadingEsenciaMain}
											<div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
												<Loader2 class="w-6 h-6 text-white animate-spin" />
												<span class="text-[10px] text-white font-semibold">Subiendo a Cloudinary...</span>
											</div>
										{/if}
									</div>

									<div class="flex flex-col gap-2">
										<label class="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 rounded-xl cursor-pointer text-slate-500 hover:text-[#D4AF37] font-semibold text-xs transition-all">
											<Upload class="w-3.5 h-3.5" />
											Subir a Cloudinary
											<input 
												type="file" 
												accept="image/*" 
												disabled={uploadingEsenciaMain}
												onchange={(e) => handleImageUpload(e, 'esencia_img_main', 'esencia_main')} 
												class="hidden" 
											/>
										</label>
										<input 
											type="text" 
											bind:value={form.esencia_img_main} 
											placeholder="O ingresa enlace directo..."
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-2.5 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-mono"
										/>
									</div>
								</div>

								<!-- Imagen Secundaria -->
								<div class="space-y-4">
									<span class="block text-xs font-bold text-slate-500 uppercase tracking-wider">B. Imagen Secundaria (Superpuesta Derecha)</span>
									<div class="relative aspect-[4/3] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 group">
										{#if form.esencia_img_secondary}
											<img src={form.esencia_img_secondary} alt="Esencia Secundaria" class="w-full h-full object-cover transition-all group-hover:scale-103" />
										{:else}
											<div class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">Sin imagen configurada</div>
										{/if}

										{#if uploadingEsenciaSecondary}
											<div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
												<Loader2 class="w-6 h-6 text-white animate-spin" />
												<span class="text-[10px] text-white font-semibold">Subiendo a Cloudinary...</span>
											</div>
										{/if}
									</div>

									<div class="flex flex-col gap-2">
										<label class="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 rounded-xl cursor-pointer text-slate-500 hover:text-[#D4AF37] font-semibold text-xs transition-all">
											<Upload class="w-3.5 h-3.5" />
											Subir a Cloudinary
											<input 
												type="file" 
												accept="image/*" 
												disabled={uploadingEsenciaSecondary}
												onchange={(e) => handleImageUpload(e, 'esencia_img_secondary', 'esencia_secondary')} 
												class="hidden" 
											/>
										</label>
										<input 
											type="text" 
											bind:value={form.esencia_img_secondary} 
											placeholder="O ingresa enlace directo..."
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-2.5 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-mono"
										/>
									</div>
								</div>
							</div>
						</div>

						<!-- 3. AMENIDADES SIGNATURE -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-8">
							<div class="flex items-center gap-4">
								<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Sparkles class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">3. Amenidades Signature</h2>
									<p class="text-sm text-gray-400">Personaliza las 3 tarjetas de experiencias únicas mostradas en la portada pública.</p>
								</div>
							</div>

							<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<!-- Amenidad 1 -->
								<div class="border border-gray-100 dark:border-gray-850 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 space-y-4">
									<div class="flex items-center justify-between">
										<span class="text-xs font-bold text-[#D4AF37]">Tarjeta 1</span>
										{#if uploadingAmenity1}
											<Loader2 class="w-4 h-4 text-[#D4AF37] animate-spin" />
										{/if}
									</div>

									<div class="relative w-20 h-20 mx-auto rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-150 flex-shrink-0">
										{#if form.amenity_sig_1_img}
											<img src={form.amenity_sig_1_img} alt="Amenidad 1" class="w-full h-full object-cover" />
										{:else}
											<div class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Sin foto</div>
										{/if}
									</div>

									<div class="space-y-3">
										<label class="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-lg cursor-pointer text-slate-500 font-semibold text-[10px] transition-all">
											<Upload class="w-3 h-3" />
											Subir Foto
											<input 
												type="file" 
												accept="image/*" 
												disabled={uploadingAmenity1}
												onchange={(e) => handleImageUpload(e, 'amenity_sig_1_img', 'amenity1')} 
												class="hidden" 
											/>
										</label>
										<input 
											type="text" 
											bind:value={form.amenity_sig_1_img} 
											placeholder="O pegar URL de imagen..."
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-[10px] focus:ring-[#D4AF37] focus:border-[#D4AF37] font-mono"
										/>
										<input 
											type="text" 
											bind:value={form.amenity_sig_1_title} 
											placeholder="Título de la Amenidad"
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-xs font-bold focus:ring-[#D4AF37] focus:border-[#D4AF37]"
										/>
										<textarea 
											rows="3"
											bind:value={form.amenity_sig_1_desc} 
											placeholder="Breve descripción de la amenidad..."
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37]"
										></textarea>
									</div>
								</div>

								<!-- Amenidad 2 -->
								<div class="border border-gray-100 dark:border-gray-850 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 space-y-4">
									<div class="flex items-center justify-between">
										<span class="text-xs font-bold text-[#D4AF37]">Tarjeta 2</span>
										{#if uploadingAmenity2}
											<Loader2 class="w-4 h-4 text-[#D4AF37] animate-spin" />
										{/if}
									</div>

									<div class="relative w-20 h-20 mx-auto rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-150 flex-shrink-0">
										{#if form.amenity_sig_2_img}
											<img src={form.amenity_sig_2_img} alt="Amenidad 2" class="w-full h-full object-cover" />
										{:else}
											<div class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Sin foto</div>
										{/if}
									</div>

									<div class="space-y-3">
										<label class="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-lg cursor-pointer text-slate-500 font-semibold text-[10px] transition-all">
											<Upload class="w-3 h-3" />
											Subir Foto
											<input 
												type="file" 
												accept="image/*" 
												disabled={uploadingAmenity2}
												onchange={(e) => handleImageUpload(e, 'amenity_sig_2_img', 'amenity2')} 
												class="hidden" 
											/>
										</label>
										<input 
											type="text" 
											bind:value={form.amenity_sig_2_img} 
											placeholder="O pegar URL de imagen..."
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-[10px] focus:ring-[#D4AF37] focus:border-[#D4AF37] font-mono"
										/>
										<input 
											type="text" 
											bind:value={form.amenity_sig_2_title} 
											placeholder="Título de la Amenidad"
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-xs font-bold focus:ring-[#D4AF37] focus:border-[#D4AF37]"
										/>
										<textarea 
											rows="3"
											bind:value={form.amenity_sig_2_desc} 
											placeholder="Breve descripción de la amenidad..."
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37]"
										></textarea>
									</div>
								</div>

								<!-- Amenidad 3 -->
								<div class="border border-gray-100 dark:border-gray-850 p-5 rounded-2xl bg-gray-50/50 dark:bg-gray-900/30 space-y-4">
									<div class="flex items-center justify-between">
										<span class="text-xs font-bold text-[#D4AF37]">Tarjeta 3</span>
										{#if uploadingAmenity3}
											<Loader2 class="w-4 h-4 text-[#D4AF37] animate-spin" />
										{/if}
									</div>

									<div class="relative w-20 h-20 mx-auto rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-gray-150 flex-shrink-0">
										{#if form.amenity_sig_3_img}
											<img src={form.amenity_sig_3_img} alt="Amenidad 3" class="w-full h-full object-cover" />
										{:else}
											<div class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Sin foto</div>
										{/if}
									</div>

									<div class="space-y-3">
										<label class="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-[#D4AF37] hover:text-[#D4AF37] rounded-lg cursor-pointer text-slate-500 font-semibold text-[10px] transition-all">
											<Upload class="w-3 h-3" />
											Subir Foto
											<input 
												type="file" 
												accept="image/*" 
												disabled={uploadingAmenity3}
												onchange={(e) => handleImageUpload(e, 'amenity_sig_3_img', 'amenity3')} 
												class="hidden" 
											/>
										</label>
										<input 
											type="text" 
											bind:value={form.amenity_sig_3_img} 
											placeholder="O pegar URL de imagen..."
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-[10px] focus:ring-[#D4AF37] focus:border-[#D4AF37] font-mono"
										/>
										<input 
											type="text" 
											bind:value={form.amenity_sig_3_title} 
											placeholder="Título de la Amenidad"
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-xs font-bold focus:ring-[#D4AF37] focus:border-[#D4AF37]"
										/>
										<textarea 
											rows="3"
											bind:value={form.amenity_sig_3_desc} 
											placeholder="Breve descripción de la amenidad..."
											class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-lg p-2 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37]"
										></textarea>
									</div>
								</div>
							</div>
						</div>

						<!-- 4. MOMENTOS ÚNICOS -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
							<div class="flex items-center gap-4 mb-4">
								<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Globe class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">4. Sección "Momentos Únicos"</h2>
									<p class="text-sm text-gray-400">Modifica el video complementario de actividades y la imagen flotante adyacente.</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
								<!-- Video Link -->
								<div class="space-y-4">
									<label for="momentos_video_url" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Video de Actividades (Solo enlace)</label>
									<div class="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 rounded-xl">
										<Globe class="w-4.5 h-4.5 text-gray-400 mr-2 flex-shrink-0" />
										<input 
											id="momentos_video_url"
											type="text" 
											bind:value={form.momentos_video_url} 
											class="flex-1 bg-transparent border-0 outline-none text-xs text-slate-900 dark:text-white focus:ring-0 focus:border-0 py-3.5 p-0 font-mono"
											placeholder="Ej: /videos/video-activities.mp4"
										/>
									</div>
									<p class="text-[10px] text-gray-400">Ruta local de video o enlace CDN directo.</p>

									<span class="block text-xs font-bold text-slate-500 uppercase tracking-wider mt-4">Previsualización del Video de Actividades</span>
									<div class="relative aspect-video rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex items-center justify-center group shadow-sm">
										{#if form.momentos_video_url}
											<!-- svelte-ignore a11y_media_has_caption -->
											<video 
												src={form.momentos_video_url} 
												class="w-full h-full object-cover" 
												controls 
												muted 
												playsinline
												preload="metadata"
											></video>
											<div class="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 pointer-events-none transition-opacity group-hover:opacity-0">
												Preview
											</div>
										{:else}
											<div class="flex flex-col items-center gap-2 text-slate-400">
												<Globe class="w-8 h-8 opacity-40 animate-pulse" />
												<span class="text-xs">Sin enlace de video activo</span>
											</div>
										{/if}
									</div>
								</div>

								<!-- Imagen Flotante -->
								<div class="space-y-4">
									<span class="block text-xs font-bold text-slate-500 uppercase tracking-wider font-['Outfit']">Imagen Decorativa Flotante</span>
									
									<div class="relative aspect-[16/10] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 group">
										{#if form.momentos_img_url}
											<img src={form.momentos_img_url} alt="Momentos Imagen Decorativa" class="w-full h-full object-cover transition-all group-hover:scale-103" />
										{:else}
											<div class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">Sin imagen configurada</div>
										{/if}

										{#if uploadingMomentosImg}
											<div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
												<Loader2 class="w-6 h-6 text-white animate-spin" />
												<span class="text-[10px] text-white font-semibold">Subiendo a Cloudinary...</span>
											</div>
										{/if}
									</div>

									<div class="flex flex-col gap-2">
										<label class="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 rounded-xl cursor-pointer text-slate-500 hover:text-[#D4AF37] font-semibold text-xs transition-all">
											<Upload class="w-3.5 h-3.5" />
											Subir a Cloudinary
											<input 
												type="file" 
												accept="image/*" 
												disabled={uploadingMomentosImg}
												onchange={(e) => handleImageUpload(e, 'momentos_img_url', 'momentos_img')} 
												class="hidden" 
											/>
										</label>
										<input 
											type="text" 
											bind:value={form.momentos_img_url} 
											placeholder="O pega enlace directo..."
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-2.5 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37] font-mono"
										/>
									</div>
								</div>
							</div>
						</div>

						<!-- 5. REDES SOCIALES EN EL FOOTER -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
							<div class="flex items-center gap-4 mb-4">
								<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Globe class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">5. Redes Sociales (Pie de Página)</h2>
									<p class="text-sm text-gray-400">Define los enlaces de redirección a los perfiles oficiales del resort.</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-3 gap-5">
								<!-- Instagram -->
								<div class="space-y-2">
									<label for="social_instagram" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Instagram</label>
									<input 
										id="social_instagram"
										type="text" 
										bind:value={form.social_instagram} 
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
										placeholder="https://instagram.com/tu_hotel"
									/>
								</div>

								<!-- Twitter -->
								<div class="space-y-2">
									<label for="social_twitter" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Twitter (X)</label>
									<input 
										id="social_twitter"
										type="text" 
										bind:value={form.social_twitter} 
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
										placeholder="https://twitter.com/tu_hotel"
									/>
								</div>

								<!-- Facebook -->
								<div class="space-y-2">
									<label for="social_facebook" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Facebook</label>
									<input 
										id="social_facebook"
										type="text" 
										bind:value={form.social_facebook} 
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all font-semibold"
										placeholder="https://facebook.com/tu_hotel"
									/>
								</div>
							</div>
						</div>

						<!-- 6. PREGUNTAS FRECUENTES (FAQ) -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/50 pb-6">
								<div class="flex items-center gap-4">
									<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
										<Sparkles class="w-6 h-6" />
									</div>
									<div>
										<h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">6. Preguntas Frecuentes (FAQ)</h2>
										<p class="text-sm text-gray-400">Configura los acordeones de dudas frecuentes que se muestran al final de la página de inicio.</p>
									</div>
								</div>
								
								<button 
									type="button"
									onclick={addFaqItem}
									class="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-[#D4AF37] dark:bg-gray-800 dark:hover:bg-[#D4AF37] text-white rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none"
								>
									<Plus class="w-4 h-4" />
									Añadir Pregunta
								</button>
							</div>

							{#if faqsList.length === 0}
								<div class="text-center py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/20 dark:bg-gray-900/10">
									<Info class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
									<p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Sin Preguntas Frecuentes</p>
									<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Presiona "Añadir Pregunta" para crear el primer acordeón de tu catálogo.</p>
								</div>
							{:else}
								<div class="space-y-4 max-h-[600px] overflow-y-auto pr-2">
									{#each faqsList as faq, i (i)}
										<div 
											class="relative group p-6 bg-gray-50/50 dark:bg-gray-950/20 border border-gray-100 dark:border-gray-850 rounded-[24px] space-y-4 transition-all hover:bg-white dark:hover:bg-gray-900 hover:shadow-md hover:border-[#D4AF37]/20"
											transition:slide={{ duration: 200 }}
										>
											<!-- Cabecera de la pregunta: Controles e índice -->
											<div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
												<span class="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Acordeón #{i + 1}</span>
												
												<div class="flex items-center gap-2">
													<!-- Mover Arriba -->
													<button 
														type="button"
														disabled={i === 0}
														onclick={() => moveFaqItem(i, 'up')}
														class="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-[#D4AF37] hover:text-white rounded-lg transition-all disabled:opacity-20 disabled:hover:bg-white dark:disabled:hover:bg-gray-800"
														title="Mover arriba"
													>
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
													</button>
													
													<!-- Mover Abajo -->
													<button 
														type="button"
														disabled={i === faqsList.length - 1}
														onclick={() => moveFaqItem(i, 'down')}
														class="p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-[#D4AF37] hover:text-white rounded-lg transition-all disabled:opacity-20 disabled:hover:bg-white dark:disabled:hover:bg-gray-800"
														title="Mover abajo"
													>
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
													</button>

													<!-- Eliminar -->
													<button 
														type="button" 
														onclick={() => removeFaqItem(i)}
														class="p-1.5 bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-500 hover:text-white rounded-lg transition-all"
														title="Eliminar pregunta"
													>
														<Trash2 class="w-3.5 h-3.5" />
													</button>
												</div>
											</div>

											<!-- Inputs de Pregunta y Respuesta -->
											<div class="grid grid-cols-1 gap-4">
												<div class="space-y-1">
													<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pregunta</label>
													<input 
														type="text" 
														bind:value={faq.question}
														placeholder="Ej: ¿Cuáles son las políticas de check-in?"
														class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-xl p-3 text-xs font-bold focus:ring-[#D4AF37] focus:border-[#D4AF37]"
													/>
												</div>
												<div class="space-y-1">
													<label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Respuesta</label>
													<textarea 
														rows="3"
														bind:value={faq.answer}
														placeholder="Escribe la respuesta en tono sofisticado y premium..."
														class="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-xl p-3 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37]"
													></textarea>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<!-- 7. ENCUÉNTRANOS (CONTACTO Y MAPA) -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
							<div class="flex items-center gap-4 mb-4">
								<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Globe class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-bold text-slate-900 dark:text-white leading-tight">7. Sección "Encuéntranos" (Contacto y Mapa)</h2>
									<p class="text-sm text-gray-400">Personaliza la información de localización, números de atención del resort y el mapa interactivo de Google Maps.</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div class="space-y-4">
									<div>
										<label for="map_address" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección Física del Hotel</label>
										<input 
											id="map_address"
											type="text" 
											bind:value={form.map_address} 
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
											placeholder="Ej: Km. 14.5, Carretera Costera, Bahía Paraíso"
										/>
									</div>

									<div>
										<label for="map_phone" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Teléfono Público de Recepción</label>
										<input 
											id="map_phone"
											type="text" 
											bind:value={form.map_phone} 
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
											placeholder="Ej: +502 7820-2400"
										/>
									</div>
								</div>

								<div class="space-y-4">
									<div>
										<label for="map_email" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Oficial de Consultas</label>
										<input 
											id="map_email"
											type="email" 
											bind:value={form.map_email} 
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
											placeholder="Ej: concierge@aferesort.com"
										/>
									</div>

									<div>
										<label for="map_hours" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Horarios Especiales / Check-in</label>
										<input 
											id="map_hours"
											type="text" 
											bind:value={form.map_hours} 
											class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-xl p-3 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
											placeholder="Ej: Check-in: 15:00 | Check-out: 11:00 (24/7)"
										/>
									</div>
								</div>
							</div>

							<div class="space-y-4 pt-4 border-t border-gray-150 dark:border-gray-800">
								<div>
									<label for="map_iframe_url" class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enlace del Iframe del Mapa (Google Maps)</label>
									<input 
										id="map_iframe_url"
										type="text" 
										bind:value={form.map_iframe_url} 
										class="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white rounded-xl p-3 text-xs focus:ring-[#D4AF37] focus:border-[#D4AF37] font-mono"
										placeholder="Pega el link 'src' del iframe de compartir en Google Maps..."
									/>
									<p class="text-[10px] text-gray-400 mt-1">Cómo obtenerlo: Ve a Google Maps > Compartir > Incorporar mapa > Copia únicamente el link dentro de la propiedad 'src' del código HTML.</p>
								</div>

								<div class="space-y-2">
									<span class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Previsualización en Vivo del Mapa</span>
									<div class="relative aspect-video rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 shadow-inner flex items-center justify-center">
										{#if form.map_iframe_url}
											<iframe 
												title="Google Maps"
												src={form.map_iframe_url} 
												class="w-full h-full border-0 rounded-3xl" 
												allowfullscreen={true} 
												loading="lazy" 
												referrerpolicy="no-referrer-when-downgrade"
											></iframe>
										{:else}
											<div class="text-center p-6 text-slate-400">
												<Globe class="w-8 h-8 opacity-30 animate-pulse mx-auto mb-2" />
												<span class="text-xs">No hay mapa configurado. Ingresa un enlace arriba.</span>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>

						<!-- GUARDADO GLOBAL -->
						<div class="max-w-4xl mx-auto flex justify-end">
							<button 
								onclick={saveWebContent}
								disabled={isSavingGroup['contenido_web'] || uploadingEsenciaMain || uploadingEsenciaSecondary || uploadingAmenity1 || uploadingAmenity2 || uploadingAmenity3 || uploadingMomentosImg}
								class="px-8 py-4 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-2xl text-base font-bold transition-all shadow-lg hover:shadow-xl flex items-center gap-2 focus:outline-none focus:ring-4 focus:ring-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-wait"
							>
								{#if isSavingGroup['contenido_web']}
									<Loader2 class="w-5 h-5 text-white animate-spin" />
									Guardando Contenido Web...
								{:else}
									<Save class="w-5 h-5" />
									Guardar Todo el Contenido Web
								{/if}
							</button>
						</div>

					</div>
				{/if}

				<!-- TAB 4: CATÁLOGO PÚBLICO (FILTROS DE AMENIDADES) -->
				{#if activeTab === 'catalogo'}
					<div class="space-y-6" in:fade={{ duration: 150 }}>
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto">
							<div class="flex items-center gap-4 mb-8">
								<div class="p-3.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Sparkles class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-['Outfit'] font-bold text-slate-900 dark:text-white leading-tight">Filtros del Catálogo de Habitaciones</h2>
									<p class="text-sm text-gray-400">Selecciona las amenidades y características que los huéspedes podrán usar para filtrar en la página de habitaciones.</p>
								</div>
							</div>

							{#if amenities.length === 0}
								<p class="text-sm text-gray-400 py-10 text-center">No hay amenidades de habitación creadas en el sistema todavía. Por favor, crea amenidades primero en el catálogo maestro.</p>
							{:else}
								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
									{#each amenities as amenity (amenity.id)}
										{@const isChecked = selectedAmenityIds.includes(amenity.id)}
										<button
											type="button"
											onclick={() => toggleAmenityFilter(amenity.id)}
											class="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left bg-gray-50/50 dark:bg-gray-800/30 border-transparent hover:border-gray-200 dark:hover:border-gray-800 {isChecked ? 'bg-[#D4AF37]/5 dark:bg-[#D4AF37]/5 !border-[#D4AF37] text-[#D4AF37]' : 'text-gray-600 dark:text-gray-400'}"
										>
											<!-- Checkbox box -->
											<div class="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 {isChecked ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-gray-300 dark:border-gray-600'}">
												{#if isChecked}
													<svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
												{/if}
											</div>
											
											<!-- Amenity Icon -->
											<div class="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center flex-shrink-0 text-slate-500 dark:text-slate-400">
												<AmenityIcon name={amenity.icon || ''} size={18} />
											</div>

											<div class="min-w-0 flex-1">
												<span class="text-sm font-semibold truncate block leading-tight">{amenity.name}</span>
												{#if amenity.category}
													<span class="text-[10px] text-gray-400 uppercase tracking-wider block mt-0.5">{amenity.category.name}</span>
												{/if}
											</div>
										</button>
									{/each}
								</div>
							{/if}

							<div class="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
								<button 
									onclick={saveAmenityFilters}
									disabled={isSavingGroup['catalogo']}
									class="px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
								>
									{#if isSavingGroup['catalogo']}
										<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
										Guardando Filtros...
									{:else}
										<Save class="w-4.5 h-4.5" />
										Guardar Filtros del Catálogo
									{/if}
								</button>
							</div>
						</div>

						<!-- Card: Suites Destacadas de la Página de Inicio -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-6">
							<div class="flex items-center gap-4 mb-8">
								<div class="p-3.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
									<Sparkles class="w-6 h-6" />
								</div>
								<div>
									<h2 class="text-xl font-['Outfit'] font-bold text-slate-900 dark:text-white leading-tight">Suites Destacadas de la Página de Inicio</h2>
									<p class="text-sm text-gray-400">Selecciona hasta 3 habitaciones para exhibir de forma prioritaria en la portada pública del resort. El orden de selección (1, 2, 3) determinará cómo se muestran.</p>
								</div>
							</div>

							{#if rooms.length === 0}
								<p class="text-sm text-gray-400 py-10 text-center">No hay habitaciones activas registrada en el sistema todavía.</p>
							{:else}
								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
									{#each rooms as room (room.id)}
										{@const selectIndex = selectedFeaturedRoomIds.indexOf(room.id)}
										{@const isSelected = selectIndex !== -1}
										<button
											type="button"
											onclick={() => toggleFeaturedRoom(room.id)}
											class="flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left bg-gray-50/50 dark:bg-gray-800/30 border-transparent hover:border-gray-200 dark:hover:border-gray-800 {isSelected ? 'bg-[#D4AF37]/5 dark:bg-[#D4AF37]/5 !border-[#D4AF37] text-[#D4AF37]' : 'text-gray-600 dark:text-gray-400'}"
										>
											<!-- Number/Order Indicator -->
											<div class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all {isSelected ? 'bg-[#D4AF37] border-[#D4AF37] text-white' : 'border-gray-300 dark:border-gray-600'}">
												{#if isSelected}
													{selectIndex + 1}
												{/if}
											</div>
											
											<!-- Cover Mini Image -->
											<div class="w-12 h-10 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-900 flex-shrink-0">
												<img src={room.cover_image_url || (room.images && room.images[0]?.url) || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&q=80'} alt="Preview" class="w-full h-full object-cover" />
											</div>

											<div class="min-w-0 flex-1">
												<span class="text-sm font-semibold truncate block leading-tight">Suite No. {room.number}</span>
												<span class="text-[10px] text-gray-400 uppercase tracking-wider block mt-0.5">{room.type}</span>
											</div>
										</button>
									{/each}
								</div>
							{/if}

							<div class="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
								<button 
									type="button"
									onclick={saveFeaturedRooms}
									disabled={isSavingGroup['featured_rooms']}
									class="px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
								>
									{#if isSavingGroup['featured_rooms']}
										<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
										Guardando Selección...
									{:else}
										<Save class="w-4.5 h-4.5" />
										Guardar Selección de Destacadas
									{/if}
								</button>
							</div>
						</div>

						<!-- Card: Imágenes de Héroes -->
						<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm max-w-4xl mx-auto space-y-10">
							<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/50 pb-6">
								<div class="flex items-center gap-4">
									<div class="p-3.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl">
										<Hotel class="w-6 h-6" />
									</div>
									<div>
										<h2 class="text-xl font-['Outfit'] font-bold text-slate-900 dark:text-white leading-tight">Imágenes del Portal Público (Héroes)</h2>
										<p class="text-sm text-gray-400">Personaliza de forma interactiva los banners principales cargando fotos a Cloudinary.</p>
									</div>
								</div>
							</div>

							<!-- SECCIÓN 1: HABITACIONES HERO (CARRUSEL) -->
							<div class="space-y-6">
								<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<h3 class="text-base font-bold text-slate-900 dark:text-gray-100 leading-tight">1. Carrusel del Catálogo de Habitaciones</h3>
										<p class="text-xs text-gray-400">Las imágenes que los huéspedes verán en el carrusel principal. Recomendado: 3 a 6 fotos de alta resolución.</p>
									</div>
									<button 
										type="button"
										onclick={resetRoomsHero}
										class="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 text-gray-500 dark:text-gray-400 hover:text-[#D4AF37] rounded-xl text-xs font-semibold transition-all hover:bg-[#D4AF37]/5"
									>
										<RotateCcw class="w-3.5 h-3.5" />
										Restablecer por Defecto
									</button>
								</div>

								<!-- Cuadrícula de diapositivas interactivas -->
								<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
									{#each roomsImagesList as url, index (url + index)}
										<div class="relative group aspect-[16/10] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-850 shadow-sm bg-gray-50 dark:bg-gray-900">
											<img src={url} alt="Diapositiva {index + 1}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
											
											<!-- Overlay Glassmorphic al hacer hover -->
											<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3.5 backdrop-blur-xs">
												<div class="flex items-center justify-between">
													<span class="px-2.5 py-0.5 bg-black/55 backdrop-blur-md text-white rounded-md text-[10px] font-semibold border border-white/10 uppercase tracking-wider">
														Slide {index + 1}
													</span>
													
													<button 
														type="button" 
														onclick={() => removeRoomImage(index)}
														class="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
														title="Eliminar esta diapositiva"
													>
														<Trash2 class="w-3.5 h-3.5" />
													</button>
												</div>

												<div class="flex items-center justify-center gap-3">
													<button 
														type="button"
														disabled={index === 0}
														onclick={() => moveRoomImage(index, 'left')}
														class="p-2 bg-white/10 hover:bg-[#D4AF37] disabled:opacity-20 disabled:hover:bg-white/10 text-white rounded-lg transition-all"
														title="Mover a la izquierda"
													>
														<ArrowLeft class="w-4 h-4" />
													</button>
													<button 
														type="button"
														disabled={index === roomsImagesList.length - 1}
														onclick={() => moveRoomImage(index, 'right')}
														class="p-2 bg-white/10 hover:bg-[#D4AF37] disabled:opacity-20 disabled:hover:bg-white/10 text-white rounded-lg transition-all"
														title="Mover a la derecha"
													>
														<ArrowRight class="w-4 h-4" />
													</button>
												</div>
											</div>
										</div>
									{/each}

									<!-- Tarjeta Receptora de Archivo (Upload Box) -->
									<label class="relative aspect-[16/10] rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/60 dark:hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 flex flex-col items-center justify-center text-center p-4 transition-all group cursor-pointer">
										{#if uploadingRooms}
											<div class="flex flex-col items-center gap-2">
												<div class="animate-spin rounded-full h-8 w-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37]"></div>
												<span class="text-xs text-gray-500 font-semibold">Subiendo a Cloudinary...</span>
											</div>
										{:else}
											<div class="flex flex-col items-center gap-2 text-slate-400 group-hover:text-[#D4AF37] transition-colors">
												<div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-[#D4AF37]/10 transition-colors">
													<Upload class="w-6 h-6" />
												</div>
												<span class="text-xs font-bold font-['Outfit'] block">Subir Nueva Foto</span>
												<span class="text-[10px] text-gray-400">Soporta JPG, PNG (Max 5MB)</span>
											</div>
										{/if}
										<input 
											type="file" 
											accept="image/*" 
											disabled={uploadingRooms}
											onchange={handleRoomsUpload} 
											class="hidden" 
										/>
									</label>
								</div>

								<!-- Paste URL manual alternative -->
								<div class="bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl flex items-center gap-3">
									<Image class="w-5 h-5 text-gray-400 flex-shrink-0" />
									<input 
										type="text" 
										bind:value={newRoomImageUrl}
										placeholder="O pega una URL directa de imagen aquí para añadirla..." 
										class="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 focus:border-0 p-0"
									/>
									<button 
										type="button" 
										onclick={addRoomImageManually}
										disabled={!newRoomImageUrl.trim()}
										class="px-4 py-2 bg-slate-900 hover:bg-[#D4AF37] disabled:opacity-50 disabled:hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 focus:outline-none"
									>
										<Plus class="w-3.5 h-3.5" />
										Añadir
									</button>
								</div>
							</div>

							<!-- SECCIÓN 2: RESERVACIONES HERO -->
							<div class="space-y-6 border-t border-gray-100 dark:border-gray-800/50 pt-8">
								<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
									<div>
										<h3 class="text-base font-bold text-slate-900 dark:text-gray-100 leading-tight">2. Imagen de Fondo de "Mis Reservas"</h3>
										<p class="text-xs text-gray-400">Esta imagen se mostrará en el banner superior cuando los clientes ingresen a ver sus reservaciones.</p>
									</div>
									<button 
										type="button"
										onclick={resetReservationsHero}
										class="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 dark:border-gray-700 hover:border-amber-500/50 text-gray-500 dark:text-gray-400 hover:text-[#D4AF37] rounded-xl text-xs font-semibold transition-all hover:bg-[#D4AF37]/5"
									>
										<RotateCcw class="w-3.5 h-3.5" />
										Restablecer por Defecto
									</button>
								</div>

								<!-- Preview banner en tiempo real -->
								<div class="relative w-full aspect-[21/8] sm:aspect-[24/7] rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm bg-gray-50 dark:bg-gray-900 group">
									{#if form.hero_image_reservations}
										<img src={form.hero_image_reservations} alt="Preview Banner Reservas" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102" />
									{:else}
										<div class="absolute inset-0 flex items-center justify-center text-gray-400">Sin imagen de fondo activa</div>
									{/if}
									<div class="absolute inset-0 bg-black/45 flex flex-col justify-end p-6">
										<span class="text-white text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-1">Previsualización del Banner</span>
										<h4 class="text-white text-lg sm:text-2xl font-bold font-['Outfit']">Mis Reservaciones</h4>
									</div>

									{#if uploadingReservations}
										<div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
											<div class="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white"></div>
											<span class="text-xs text-white font-semibold">Subiendo a Cloudinary...</span>
										</div>
									{/if}
								</div>

								<!-- Acciones de carga para reservaciones -->
								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label class="flex items-center justify-center gap-2 w-full px-5 py-3.5 border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/5 rounded-2xl cursor-pointer text-slate-500 hover:text-[#D4AF37] font-semibold text-xs transition-all">
											<Upload class="w-4 h-4" />
											Subir imagen local a Cloudinary
											<input 
												type="file" 
												accept="image/*" 
												disabled={uploadingReservations}
												onchange={handleReservationsUpload} 
												class="hidden" 
											/>
										</label>
									</div>

									<div class="relative flex items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 rounded-2xl">
										<Image class="w-4.5 h-4.5 text-gray-400 mr-2 flex-shrink-0" />
										<input 
											type="text" 
											bind:value={form.hero_image_reservations} 
											placeholder="O ingresa una URL manual directamente aquí..."
											class="flex-1 bg-transparent border-0 outline-none text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-0 focus:border-0 py-3.5 p-0 font-mono"
										/>
									</div>
								</div>
							</div>

							<!-- Botón de guardado unificado -->
							<div class="mt-10 pt-6 border-t border-gray-100 dark:border-gray-800/50 flex justify-end">
								<button 
									onclick={saveHeroImages}
									disabled={isSavingGroup['hero_images'] || uploadingRooms || uploadingReservations}
									class="px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] disabled:opacity-50 disabled:cursor-wait"
								>
									{#if isSavingGroup['hero_images']}
										<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
										Guardando Cambios...
									{:else}
										<Save class="w-4.5 h-4.5" />
										Guardar Imágenes de Héroes
									{/if}
								</button>
							</div>
						</div>
					</div>
				{/if}

			</div>
		{/if}
	</div>
</div>

<!-- Modal de Selección de Roles (Centro de Notificaciones) -->
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
