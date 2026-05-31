<script lang="ts">
	import { authStore } from '$lib/stores/auth.store';
	import { getPublicRooms } from '$lib/services/room.service';
	import { fetchPublicSettings } from '$lib/services/settings.service';
	import PublicNavbar from '$lib/components/layout/PublicNavbar.svelte';
	import PublicFooter from '$lib/components/layout/PublicFooter.svelte';
	import PriceAwareDatePicker from '$lib/components/ui/PriceAwareDatePicker.svelte';
	import GuestPicker from '$lib/components/ui/GuestPicker.svelte';
	import type { RoomRead } from '$lib/types/room';
	import { onMount, tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fade, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	
	let expandedRoomVideoId = $state<number | string | null>(null);

	const suiteVideos = [
		"/videos/habitacion1-video.mp4",
		"https://players.brightcove.net/13596767001/default_default/index.mp4?videoId=5989745136001",
		"https://videos.pexels.com/video-files/3133674/3133674-uhd_2560_1440_30fps.mp4"
	];

	
	let featuredRooms = $state<RoomRead[]>([]);
	let settingsState = $state<any>(null);
	let loading = $state(true);
	let scrollY = $state(0);
	
	import { createPersistence } from '$lib/utils/persistence';
	
	const persistence = createPersistence({
		key: 'public_rooms',
		defaultValues: {
			checkIn: '',
			checkOut: '',
			guests: '1'
		}
	});

	const initialState = persistence.getInitialState();

	let checkIn = $state(initialState.checkIn);
	let checkOut = $state(initialState.checkOut);
	let guests = $state(initialState.guests);
	
	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			checkIn,
			checkOut,
			guests
		});
	});
	
	onMount(async () => {
		const handleScroll = () => {
			scrollY = window.scrollY;
			const reveals = document.querySelectorAll('.reveal');
			for (let i = 0; i < reveals.length; i++) {
				const windowHeight = window.innerHeight;
				const elementTop = reveals[i].getBoundingClientRect().top;
				const elementVisible = 100;
				if (elementTop < windowHeight - elementVisible) {
					reveals[i].classList.add('active');
				}
			}
		};
		window.addEventListener('scroll', handleScroll);
		
		try {
			const [rooms, settings] = await Promise.all([
				getPublicRooms(),
				fetchPublicSettings()
			]);
			settingsState = settings;
			
			if (settings?.featured_rooms_home) {
				const featuredIds = settings.featured_rooms_home.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
				if (featuredIds.length > 0) {
					const roomMap = new Map(rooms.map(r => [r.id, r]));
					const orderedRooms: RoomRead[] = [];
					for (const id of featuredIds) {
						const r = roomMap.get(id);
						if (r) orderedRooms.push(r);
					}
					// Rellenar con las demás habitaciones del catálogo público si hay menos de 3
					if (orderedRooms.length < 3) {
						for (const r of rooms) {
							if (!orderedRooms.some(or => or.id === r.id)) {
								orderedRooms.push(r);
							}
						}
					}
					featuredRooms = orderedRooms;
				} else {
					featuredRooms = rooms;
				}
			} else {
				featuredRooms = rooms;
			}
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
			tick().then(() => {
				setTimeout(handleScroll, 100);
			});
		}
		
		return () => window.removeEventListener('scroll', handleScroll);
	});

	let isLoggedIn = $derived(!!$authStore.user);

	// Monolith Tilt Interaction
	let monolithEl = $state<HTMLElement | null>(null);
	let tiltX = $state(0);
	let tiltY = $state(0);

	function handleMonolithMouseMove(e: MouseEvent) {
		if (!monolithEl) return;
		const rect = monolithEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		tiltX = (y - centerY) / 20;
		tiltY = (centerX - x) / 40;
	}

	function resetMonolithTilt() {
		tiltX = 0;
		tiltY = 0;
	}

	function getTodayPrice(room: RoomRead) {
		const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
		let multiplier = 1.0;
		
		if (room.season_prices) {
			for (const sp of room.season_prices) {
				if (!sp.is_archived && todayStr >= sp.start_date && todayStr <= sp.end_date) {
					multiplier = Number(sp.price_multiplier);
					break;
				}
			}
		}
		return Number(room.base_price) * multiplier;
	}

	// Lógica reactiva para acordeones de FAQs
	let faqOpenIndex = $state<number | null>(null);
	
	const defaultFaqs = [
		{
			question: "¿Cuál es el horario de Check-in y Check-out?",
			answer: "El horario estándar de Check-in es a partir de las 15:00 horas, permitiéndole ingresar a nuestras suites inmersivas de lujo. El Check-out es a las 11:00 horas para asegurar la preparación óptima y sanitización de las habitaciones."
		},
		{
			question: "¿El resort cuenta con políticas de cancelación flexible?",
			answer: "Sí, ofrecemos cancelación sin penalidad hasta 48 horas antes de su llegada programada para reservaciones estándar. Para tarifas especiales o en alta temporada, se aplican términos específicos que podrá revisar al reservar."
		},
		{
			question: "¿Tienen servicio de traslado desde el aeropuerto?",
			answer: "Absolutamente. AFE Resort & Spa ofrece traslados privados en vehículos híbridos de alta gama. Este servicio puede coordinarse con nuestro Concierge Privado con un mínimo de 24 horas de anticipación."
		},
		{
			question: "¿Se permiten mascotas en el resort?",
			answer: "Disponemos de suites especialmente acondicionadas para recibir a sus acompañantes caninos (máximo 15kg). Aplica una tarifa única de sanitización y es indispensable notificarlo al realizar su reserva."
		}
	];

	let faqs = $derived.by(() => {
		const raw = settingsState?.faq_items_json || '';
		if (!raw || raw === '[]') return defaultFaqs;
		try {
			const parsed = JSON.parse(raw);
			return parsed.length > 0 ? parsed : defaultFaqs;
		} catch (e) {
			return defaultFaqs;
		}
	});
</script>

<svelte:head>
	<title>AFE Resort & Spa | Lujo Redefinido</title>
</svelte:head>

<div class="luxury-landing">
	<!-- Navbar Glassmorphism -->
	<PublicNavbar alwaysTransparent={true} />

	<!-- Hero Cinematic -->
	<header class="hero-cinematic">
		<div class="hero-bg">
			<!-- Video background (usando Coverr royalty-free) -->
			<video 
				src={settingsState?.hero_video_url || "/videos/hotel-hero-video2.mp4"} 
				class="parallax-video" 
				autoplay loop muted playsinline>
			</video>

			<div class="gradient-overlay"></div>
		</div>
		
		<div class="hero-content fade-up-delay">
			<div class="badge">Bienvenidos al Paraíso</div>
			
			{#if loading}
				<!-- Premium Shimmer Skeleton para textos del Hero -->
				<div class="space-y-5 flex flex-col items-center animate-pulse py-4">
					<!-- Shimmer del Título (Línea 1) -->
					<div class="h-14 md:h-20 w-80 md:w-[600px] bg-white/10 rounded-2xl relative overflow-hidden">
						<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
					</div>
					<!-- Shimmer del Título (Línea 2) -->
					<div class="h-14 md:h-20 w-64 md:w-[450px] bg-white/10 rounded-2xl relative overflow-hidden">
						<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
					</div>
					<!-- Shimmer del Subtítulo (Líneas de texto) -->
					<div class="h-4.5 w-72 md:w-[500px] bg-white/10 rounded-xl mt-6 relative overflow-hidden">
						<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
					</div>
					<div class="h-4.5 w-56 md:w-[350px] bg-white/10 rounded-xl relative overflow-hidden">
						<div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
					</div>
				</div>
			{:else}
				<!-- Contenido Dinámico con Entrada Suave -->
				<div class="fade-in-slow">
					<h1 class="title-display">
						{#if settingsState?.hero_title}
							{@const segments = settingsState.hero_title.split('/')}
							{#each segments as segment, index}
								{#if index % 2 === 1}
									<span>{segment}</span>
								{:else}
									{segment}
								{/if}
							{/each}
						{:else}
							Lujo <span>sin</span><br/>concesiones.
						{/if}
					</h1>
					<p class="subtitle">{settingsState?.hero_subtitle || "Descubre una experiencia arquitectónica y de hospitalidad diseñada para exceder cada una de tus expectativas."}</p>
				</div>
			{/if}
		</div>
		<!-- The Crystal Monolith Booking Interface -->
		<div 
			bind:this={monolithEl}
			onmousemove={handleMonolithMouseMove}
			onmouseleave={resetMonolithTilt}
			class="booking-monolith-container fade-up-delay-2"
			style="transform: perspective(1000px) rotateX({tiltX}deg) rotateY({tiltY}deg) translateY({tiltX * -2}px)"
		>
			<form action="/rooms" class="monolith-form">
				<!-- Unified Segment: Estadía (Check-In & Check-Out) -->
				<div class="monolith-segment dates-segment group">
					<div class="segment-glow"></div>
					<div class="segment-content">
						<PriceAwareDatePicker 
							startDate={checkIn} 
							endDate={checkOut} 
							rooms={featuredRooms} 
							onSelect={(s, e) => { checkIn = s; checkOut = e; }} 
						/>
						<input type="hidden" name="checkIn" value={checkIn} />
						<input type="hidden" name="checkOut" value={checkOut} />
					</div>
					<div class="segment-divider"></div>
				</div>

				<!-- Segment 3: Huéspedes -->
				<div class="monolith-segment group">
					<div class="segment-glow"></div>
					<div class="segment-content">
						<GuestPicker value={guests} onSelect={(val) => guests = val} />
						<input type="hidden" name="guests" value={guests} />
					</div>
				</div>

				<!-- Monolith Action Button -->
				<div class="monolith-action">
					<button type="submit" class="btn-monolith">
						<span>Explorar</span>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
					</button>
				</div>
			</form>
		</div>
v>
	</header>

	<!-- Experience Section (Now holding Suites content) -->
	<section class="experience-section reveal">
		<div class="container relative z-10">
			<div class="section-header reveal">
				<h4 class="section-label text-center">ALOJAMIENTO</h4>
				<h2 class="text-center font-['Outfit'] font-light">Suites <span class="text-[#D4AF37] italic font-medium">Destacadas</span></h2>
			</div>

			{#if loading}
				<div class="flex justify-center py-20"><div class="spinner"></div></div>
			{:else if featuredRooms.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12 reveal">
					{#each featuredRooms.slice(0, 3).filter(r => expandedRoomVideoId === null || expandedRoomVideoId === r.id) as room (room.id)}
							<div 
								animate:flip={{ duration: 700, easing: cubicOut }}
								out:fade={{ duration: 300 }}
								class="group relative overflow-hidden bg-white dark:bg-[#0B0E14] border border-slate-100 dark:border-slate-800/80 shadow-lg hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] hover:border-[#D4AF37]/50 transition-all duration-700 flex flex-col {expandedRoomVideoId === room.id ? 'lg:col-span-3 rounded-[3rem] lg:flex-row h-[#70vh]' : 'rounded-[2.5rem] hover:-translate-y-3'}"
							>
								<div class="relative {expandedRoomVideoId === room.id ? 'w-full lg:w-2/3 h-full order-1 lg:order-2' : 'h-72 md:h-80 w-full'} overflow-hidden">
									{#if expandedRoomVideoId === room.id}
										<video src={suiteVideos[featuredRooms.findIndex(r => r.id === room.id) % suiteVideos.length]} autoplay loop muted controls playsinline class="w-full h-full object-cover animate-fade-in"></video>
										<button onclick={() => expandedRoomVideoId = null} class="absolute top-6 right-6 lg:top-8 lg:right-8 z-30 bg-black/40 text-white rounded-full p-3 hover:bg-black hover:scale-110 transition-all duration-300 backdrop-blur-md border border-white/20 shadow-2xl">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
										</button>
									{:else}
										{#if room.cover_image_url}
											<img src={room.cover_image_url} alt="{room.type}" class="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
										{:else if room.images && room.images.length > 0}
											<img src={room.images[0].url} alt="{room.type}" class="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
										{:else}
											<img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Suite de Lujo" class="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-110" />
										{/if}
										
										<!-- Hover Overlay -->
										<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-sm z-10 pointer-events-none">
											<a href="/rooms/{room.id}" class="pointer-events-auto px-8 py-3 rounded-full bg-white/10 border border-white/50 text-white font-medium tracking-wide backdrop-blur-md hover:bg-white hover:text-black hover:border-white transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
												Explorar Suite
											</a>
										</div>
									{/if}
									
									<!-- Price Tag Floating on Image (Hidden when playing video) -->
									{#if expandedRoomVideoId !== room.id}
										<div class="absolute bottom-4 left-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-2 rounded-2xl text-slate-900 dark:text-white shadow-xl border border-slate-200 dark:border-slate-700">
											<span class="font-['Outfit'] font-bold text-xl">${getTodayPrice(room).toFixed(2)}</span>
											<span class="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">/noche</span>
										</div>
									{/if}
								</div>
								
								<div class="flex-1 flex flex-col {expandedRoomVideoId === room.id ? 'w-full lg:w-1/3 h-full justify-center p-12 lg:p-16 order-2 lg:order-1 border-r border-[#D4AF37]/20 relative bg-gradient-to-br from-white/95 to-slate-50/90 dark:from-[#0B0E14]/95 dark:to-[#0f131a]/95' : 'p-8'}">
									<div class="flex items-start justify-between mb-4">
										<div>
											<div class="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.25em] mb-2">{room.type} Suite</div>
											<h3 class="font-['Outfit'] text-2xl md:text-3xl font-light text-slate-900 dark:text-white mb-0">Suite No. {room.number}</h3>
										</div>
									</div>
									
									<p class="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 flex-1 {expandedRoomVideoId === room.id ? 'lg:text-base' : 'line-clamp-3'}">
										{room.description || 'Experimenta la opulencia y el confort inigualable en un espacio sumamente privado y diseñado meticulosamente.'}
									</p>
									
									<div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
										<div class="flex items-center gap-5 text-[0.8rem] font-medium text-slate-500 dark:text-slate-400">
											<span class="flex items-center gap-1.5" title="Capacidad">
												<svg class="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
												{room.capacity}
											</span>
											<span class="flex items-center gap-1.5" title="WiFi Alta Velocidad">
												<svg class="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
												Sí
											</span>
										</div>
										<div class="flex items-center gap-1">
											{#if expandedRoomVideoId !== room.id}
												<!-- Play Video Button -->
												<button onclick={() => expandedRoomVideoId = room.id} title="Ver Video Inmersivo" class="text-slate-400 hover:text-[#D4AF37] transition-all p-2 rounded-full hover:bg-[#D4AF37]/10 flex items-center justify-center hover:scale-110">
													<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" stroke-width="0.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
												</button>
											{:else}
												<!-- Reemplaza PriceTag en estado expandido -->
												<div class="bg-[#D4AF37] text-[#0f131a] px-4 py-2 rounded-full font-bold text-lg font-['Outfit'] shadow-[0_0_15px_rgba(212,175,55,0.4)]">
													${getTodayPrice(room).toFixed(2)}<span class="text-xs font-medium ml-1">/noche</span>
												</div>
											{/if}
											
											<!-- Link Dettales Arrow -->
											<a href="/rooms/{room.id}" title="Ver Detalles" class="text-slate-400 hover:text-[#D4AF37] transition-all p-2 rounded-full hover:bg-[#D4AF37]/10 flex items-center justify-center hover:scale-110">
												<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 transform -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
											</a>
										</div>
									</div>
								</div>
							</div>
					{/each}
				</div>
				
				<div class="mt-20 text-center reveal">
					<a href="/rooms" class="inline-flex items-center gap-3 px-10 py-4 rounded-full border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium tracking-widest text-[0.8rem] uppercase transition-all duration-500 hover:bg-[#D4AF37] hover:border-[#D4AF37] hover:text-white dark:hover:text-white shadow-lg shadow-transparent hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] group bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
						<span>Ver Colección Completa</span>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transform transition-transform duration-500 group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
					</a>
				</div>
			{/if}
		</div>
	</section>

	<!-- Featured Suites (Now holding Experience content) -->
	<section class="suites-section relative z-10">
		<div class="container layout-split">
			<div class="split-text">
				<h4 class="section-label">NUESTRA ESENCIA</h4>
				<h2>Un santuario de <br/>tranquilidad y confort.</h2>
				<p>AFE Resort no es solo un hotel, es un destino. Cada rincón ha sido cuidadosamente diseñado con materiales premium, iluminación tenue y un servicio galardonado para garantizar que tu desconexión sea absoluta.</p>
				<ul class="luxury-list">
					<li><span>✦</span> Gastronomía de autor 24/7</li>
					<li><span>✦</span> Spa holístico subterráneo</li>
					<li><span>✦</span> Estacionamiento vip y concierge</li>
				</ul>
			</div>
			<div class="relative w-full h-[400px] sm:h-[500px] lg:h-[600px] mt-12 lg:mt-0">
				<!-- Main Image -->
				<div class="absolute top-0 right-0 w-[85%] h-[85%] rounded-[2rem] overflow-hidden shadow-2xl border border-[#D4AF37]/20 z-10 transition-transform duration-700 hover:scale-[1.02]">
					<img src={settingsState?.esencia_img_main || "https://images.unsplash.com/photo-1529316275402-0462fcc4abd6?q=80&w=1471&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"} class="w-full h-full object-cover" alt="Luxury Resort Pool" />
					<div class="absolute inset-0 bg-gradient-to-t from-[#0B0E14]/60 via-transparent to-transparent"></div>
				</div>
				
				<!-- Secondary Overlapping Image -->
				<div class="absolute bottom-0 left-0 w-[55%] h-[45%] rounded-[1.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-[6px] border-white dark:border-[#0f131a] z-20 transition-transform duration-500 hover:-translate-y-3">
					<img src={settingsState?.esencia_img_secondary || "https://images.unsplash.com/photo-1596436889106-be35e843f974?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"} class="w-full h-full object-cover" alt="Luxury Suite View" />
				</div>
				
				<!-- Creative 5-Star Badge -->
				<div class="absolute top-[10%] left-[-2%] lg:left-[-8%] z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-3 md:p-5 rounded-2xl shadow-2xl border border-[#D4AF37]/30 flex items-center gap-3 md:gap-4 animate-float">
					<div class="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#AA8222] flex items-center justify-center text-white shadow-lg transform -rotate-12 transition-transform hover:rotate-0">
						<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
					</div>
					<div>
						<p class="font-['Outfit'] font-bold text-slate-800 dark:text-white text-sm md:text-lg leading-tight">Forbes Travel <br><span class="text-[0.65rem] md:text-sm font-normal text-slate-500 dark:text-slate-400">Guide Recommended</span></p>
					</div>
				</div>

				<!-- Subtle Decorative Glow behind -->
				<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[80px] z-0 pointer-events-none"></div>
			</div>
		</div>
	</section>

	<!-- Amenities Section -->
	<section class="amenities-section reveal py-32 relative overflow-hidden">
		<!-- Elementos flotantes rebuscados (imágenes de fondo asimétricas) -->
		<div class="absolute top-[10%] left-[-5%] w-72 h-[450px] rounded-full overflow-hidden opacity-30 blur-[2px] transform rotate-12 pointer-events-none fade-up-delay">
			<img src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=600&q=80" alt="Restaurant Art" class="w-full h-full object-cover">
		</div>
		<div class="absolute bottom-[5%] right-[-2%] w-96 h-96 rounded-tr-full rounded-bl-[100px] overflow-hidden opacity-25 blur-[1px] transform -rotate-6 pointer-events-none fade-up-delay-2 hidden lg:block">
			<img src="https://plus.unsplash.com/premium_photo-1675745329954-9639d3b74bbf?q=80&w=687&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="Spa Water" class="w-full h-full object-cover">
		</div>
		
		<div class="container relative z-10">
			<div class="text-center mb-20 relative">
				<h4 class="section-label">EXCLUSIVIDAD</h4>
				<h2 class="text-4xl lg:text-5xl font-light font-['Outfit'] text-slate-900 dark:text-white mb-4">Amenidades <span class="font-medium italic text-[#D4AF37]">Signature</span></h2>
				<p class="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-lg">Elevamos su estadía con instalaciones de clase mundial diseñadas para el máximo confort y relajación, cuidando cada detalle de su experiencia.</p>
			</div>
			
			<!-- Layout asimétrico con imágenes interceptando las tarjetas -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16 mt-16">
				<!-- Card 1 -->
				<div class="relative rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-10 text-center shadow-lg dark:border-slate-800/50 dark:bg-slate-900/80 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-[#D4AF37]/50 group mt-12 md:mt-24">
					<div class="absolute -top-16 left-1/2 transform -translate-x-1/2 w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
						<img src={settingsState?.amenity_sig_1_img || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80"} alt="Dining" class="w-full h-full object-cover">
					</div>
					<div class="mt-16 mb-6">
						<svg xmlns="http://www.w3.org/2000/svg" class="mx-auto w-8 h-8 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
					</div>
					<h3 class="text-xl font-medium font-['Outfit'] mb-4 text-slate-800 dark:text-slate-100">{settingsState?.amenity_sig_1_title || "Gastronomía Premium"}</h3>
					<p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{settingsState?.amenity_sig_1_desc || "Alta cocina internacional con ingredientes orgánicos, cava subterránea y chefs galardonados estrella Michelín a su entera disposición."}</p>
				</div>
				
				<!-- Card 2 -->
				<div class="relative rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-10 text-center shadow-lg dark:border-slate-800/50 dark:bg-slate-900/80 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-[#D4AF37]/50 group">
					<div class="absolute -top-16 left-1/2 transform -translate-x-1/2 w-32 h-32 rounded-t-full rounded-br-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
						<img src={settingsState?.amenity_sig_2_img || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80"} alt="Spa" class="w-full h-full object-cover">
					</div>
					<div class="mt-16 mb-6">
						<svg xmlns="http://www.w3.org/2000/svg" class="mx-auto w-8 h-8 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 1.374 1.41l-2.062-1.41zm19.876 0a1 1 0 1 0-1.374 1.41l2.062-1.41zM12 22A10 10 0 1 1 12 2A10 10 0 0 1 12 22zM12 4a8 8 0 1 0 0 16A8 8 0 0 0 12 4zm0 2a6 6 0 1 1 0 12A6 6 0 0 1 12 6z"/></svg>
					</div>
					<h3 class="text-xl font-medium font-['Outfit'] mb-4 text-slate-800 dark:text-slate-100">{settingsState?.amenity_sig_2_title || "Spa Subterráneo"}</h3>
					<p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{settingsState?.amenity_sig_2_desc || "Santuario holístico minimalista con circuitos termales, rituales de hidroterapia con sales volcánicas y masajes de rejuvenecimiento."}</p>
				</div>
				
				<!-- Card 3 -->
				<div class="relative rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-xl p-10 text-center shadow-lg dark:border-slate-800/50 dark:bg-slate-900/80 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:border-[#D4AF37]/50 group mt-12 md:mt-16">
					<div class="absolute -top-16 left-1/2 transform -translate-x-1/2 w-32 h-32 rounded-lg rotate-12 overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0">
						<img src={settingsState?.amenity_sig_3_img || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80"} alt="Concierge" class="w-full h-full object-cover">
					</div>
					<div class="mt-16 mb-6">
						<svg xmlns="http://www.w3.org/2000/svg" class="mx-auto w-8 h-8 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
					</div>
					<h3 class="text-xl font-medium font-['Outfit'] mb-4 text-slate-800 dark:text-slate-100">{settingsState?.amenity_sig_3_title || "Concierge Privado"}</h3>
					<p class="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{settingsState?.amenity_sig_3_desc || "Organización de itinerarios completamente personalizados, servicio de chofer y acceso VIP ilimitado a experiencias exclusivas."}</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Experiences Section -->
	<section class="immersive-experiences reveal overflow-hidden relative py-24">
		<div class="container relative z-10">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
				
				<!-- Texto -->
				<div class="experiences-text order-2 lg:order-1">
					<h4 class="section-label">MOMENTOS ÚNICOS</h4>
					<h2 class="text-4xl lg:text-5xl font-light font-['Outfit'] text-slate-900 dark:text-white mb-6">Emociones que <br/><span class="text-[#D4AF37] italic font-medium">perduran</span> en el tiempo.</h2>
					<p class="text-slate-500 dark:text-slate-400 text-lg mb-10 leading-relaxed">
						La verdadera esencia del lujo no reside solo en los espacios, sino en la capacidad de crear recuerdos imborrables. Desde retiros serenos hasta cenas memorables, transformamos lo ordinario en magia.
					</p>
					
					<div class="space-y-8">
						<div class="flex items-start gap-5">
							<div class="flex-shrink-0 w-12 h-12 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-['Outfit'] text-xl font-light">
								01
							</div>
							<div>
								<h4 class="font-['Outfit'] text-xl mb-2 text-slate-800 dark:text-slate-100">Cenas Clandestinas</h4>
								<p class="text-slate-500 dark:text-slate-400 leading-relaxed">Experiencias gastronómicas secretas en locaciones asombrosas del resort, bajo las estrellas y con total privacidad.</p>
							</div>
						</div>
						
						<div class="flex items-start gap-5">
							<div class="flex-shrink-0 w-12 h-12 rounded-full border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-['Outfit'] text-xl font-light">
								02
							</div>
							<div>
								<h4 class="font-['Outfit'] text-xl mb-2 text-slate-800 dark:text-slate-100">Paseos en Bote</h4>
								<p class="text-slate-500 dark:text-slate-400 leading-relaxed">Navegación al atardecer en nuestras embarcaciones dispuestas a ser tu espacio personal en medio de las olas.</p>
							</div>
						</div>
					</div>
					
					<div class="mt-12">
						<a href="/rooms" class="inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-[#D4AF37] text-[#D4AF37] font-bold uppercase tracking-widest text-sm transition-all hover:bg-[#D4AF37] hover:text-white dark:hover:text-[#0B0E14] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
							Planear Estadía
							<span>&rarr;</span>
						</a>
					</div>
				</div>

				<!-- Video y Formas Creativas -->
				<div class="creative-video-wrapper relative order-1 lg:order-2">
					<div class="absolute -inset-10 bg-gradient-to-tr from-[#D4AF37]/20 to-transparent blur-3xl rounded-full z-0 pointer-events-none"></div>
					
					<!-- Máscara animada para el video -->
					<!-- Utilizamos animaciones en el style block global -->
					<div class="video-mask-container z-10 relative overflow-hidden shadow-2xl border-[6px] border-white/40 dark:border-white/10" style="background: #000;">
						<video 
							src={settingsState?.momentos_video_url || "/videos/video-activities.mp4"} 
							class="w-full h-full object-cover aspect-[4/5] opacity-85" 
							autoplay loop muted playsinline>
						</video>
						
						<!-- Superposición con gradiente para el texto interior -->
						<div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10">
							<span class="text-xs uppercase tracking-[3px] font-bold text-[#D4AF37] mb-2 block"></span>
							<p class="text-3xl font-light font-['Outfit'] text-white"></p>
						</div>
					</div>
					
					<!-- Elemento flotante decorativo -->
					<div class="floating-image-decorator absolute -bottom-8 -left-8 w-48 h-48 rounded-2xl overflow-hidden shadow-2xl border-[6px] border-white dark:border-[#0f131a] z-20 hidden md:block">
						<img src={settingsState?.momentos_img_url || "https://images.unsplash.com/photo-1506059612708-99d6c258160e?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"} alt="Spa Experience" class="w-full h-full object-cover" />
					</div>
				</div>
				
			</div>
		</div>
	</section>

	<!-- Preguntas Frecuentes (FAQ) Section -->
	<section class="faq-section reveal py-32 relative overflow-hidden">
		<!-- Subtle decorative blur bg -->
		<div class="absolute -top-40 -left-40 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-[100px] pointer-events-none"></div>
		<div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

		<div class="container relative z-10">
			<div class="text-center mb-20 relative">
				<h4 class="section-label">RESOLVEMOS SUS DUDAS</h4>
				<h2 class="text-4xl lg:text-5xl font-light font-['Outfit'] text-slate-900 dark:text-white mb-4">Preguntas <span class="font-medium italic text-[#D4AF37]">Frecuentes</span></h2>
				<p class="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-lg">Todo lo que necesita saber para planificar su escapada de ensueño en nuestro santuario de exclusividad.</p>
			</div>

			<div class="max-w-3xl mx-auto space-y-4">
				{#each faqs as item, i (i)}
					{@const isOpen = faqOpenIndex === i}
					<div class="faq-item rounded-3xl border border-slate-200/50 bg-white/70 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/60 transition-all duration-300 shadow-sm {isOpen ? 'border-[#D4AF37]/40 dark:border-[#D4AF37]/30 shadow-md shadow-[#D4AF37]/5' : ''}">
						<!-- Accordion Trigger Button -->
						<button 
							type="button"
							class="w-full flex items-start justify-between gap-4 p-6 md:p-8 text-left font-['Outfit'] focus:outline-none"
							onclick={() => faqOpenIndex = isOpen ? null : i}
						>
							<span class="text-base md:text-lg font-semibold text-slate-800 dark:text-slate-100 transition-colors duration-200 break-words flex-1 {isOpen ? 'text-[#D4AF37] dark:text-[#D4AF37]' : ''}">
								{item.question}
							</span>
							<div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all duration-300 flex-shrink-0 {isOpen ? 'bg-[#D4AF37]/15 dark:bg-[#D4AF37]/20 text-[#D4AF37] rotate-180' : ''}">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
							</div>
						</button>

						<!-- Accordion Content -->
						{#if isOpen}
							<div 
								class="px-6 pb-6 md:px-8 md:pb-8 border-t border-slate-100 dark:border-slate-800/40 pt-4 overflow-hidden"
								transition:slide={{ duration: 250 }}
							>
								<p class="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed break-words whitespace-pre-line">
									{item.answer}
								</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Encuéntranos Section (Contact & Map) -->
	<section class="find-us-section reveal py-32 relative z-10 overflow-hidden">
		<div class="container relative z-10">
			<div class="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
				
				<!-- Column 1: Contact Information Cards -->
				<div class="lg:col-span-5 space-y-8">
					<div>
						<h4 class="section-label">LOCALIZACIÓN</h4>
						<h2 class="text-4xl lg:text-5xl font-light font-['Outfit'] text-slate-900 dark:text-white leading-tight mb-6">Encuentre su <br/><span class="text-[#D4AF37] italic font-medium">paraíso privado</span>.</h2>
						<p class="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
							Ubicado en una de las costas más exclusivas y pintorescas del país, AFE Resort & Spa le ofrece un retiro inigualable lejos de la cotidianidad. 
						</p>
					</div>

					<div class="space-y-6">
						<!-- Address Card -->
						<div class="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
							<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
							</div>
							<div class="min-w-0 flex-1">
								<h4 class="font-['Outfit'] font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Dirección</h4>
								<p class="text-sm text-slate-500 dark:text-slate-400 leading-snug break-words">{settingsState?.map_address || "Km. 14.5, Carretera Costera del Sol, Bahía Paraíso, Escuintla"}</p>
							</div>
						</div>

						<!-- Phone & Email Grid -->
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
								<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="font-['Outfit'] font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Teléfono</h4>
									<p class="text-sm text-slate-500 dark:text-slate-400 font-semibold break-words">{settingsState?.map_phone || "+502 7820-2400"}</p>
								</div>
							</div>

							<div class="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
								<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
								</div>
								<div class="min-w-0 flex-1">
									<h4 class="font-['Outfit'] font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Email</h4>
									<a href="mailto:{settingsState?.map_email || 'concierge@aferesort.com'}" class="text-sm text-slate-500 dark:text-slate-400 hover:text-[#D4AF37] transition-colors break-all block">{settingsState?.map_email || "concierge@aferesort.com"}</a>
								</div>
							</div>
						</div>

						<!-- Hours Card -->
						<div class="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
							<div class="flex-shrink-0 w-12 h-12 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37] flex items-center justify-center">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
							</div>
							<div class="min-w-0 flex-1">
								<h4 class="font-['Outfit'] font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">Check-in / Recepción</h4>
								<p class="text-sm text-slate-500 dark:text-slate-400 leading-snug break-words">{settingsState?.map_hours || "Check-in: 15:00 | Check-out: 11:00 (Recepción 24/7)"}</p>
							</div>
						</div>
					</div>

					<!-- External GPS Button -->
					<div class="pt-4">
						<a 
							href="https://maps.google.com/?q={encodeURIComponent(settingsState?.map_address || 'AFE Resort & Spa')}" 
							target="_blank" 
							rel="noopener noreferrer" 
							class="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#D4AF37] hover:bg-[#AA8222] text-[#0f131a] hover:text-white font-bold uppercase tracking-widest text-xs transition-all shadow-lg hover:shadow-[0_10px_20px_rgba(212,175,55,0.3)] hover:-translate-y-0.5 active:translate-y-0"
						>
							<span>Cómo llegar en GPS</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
						</a>
					</div>
				</div>

				<!-- Column 2: Interactive Custom Google Maps -->
				<div class="lg:col-span-7 creative-video-wrapper relative w-full mt-12 lg:mt-0">
					<div class="absolute -inset-8 bg-gradient-to-tr from-[#D4AF37]/15 to-transparent blur-3xl rounded-full z-0 pointer-events-none"></div>
					
					<div class="relative w-full aspect-video md:aspect-[4/3] rounded-[32px] overflow-hidden border-[6px] border-white/50 dark:border-white/5 shadow-2xl z-10 transition-transform duration-500 hover:scale-[1.01] hover:border-[#D4AF37]/20 group bg-slate-100 dark:bg-slate-900">
						{#if settingsState?.map_iframe_url}
							<iframe 
								title="Google Maps Location"
								src={settingsState.map_iframe_url} 
								class="w-full h-full border-0 rounded-[26px] opacity-90 group-hover:opacity-100 transition-opacity" 
								allowfullscreen={true} 
								loading="lazy" 
								referrerpolicy="no-referrer-when-downgrade"
							></iframe>
						{:else}
							<iframe 
								title="Google Maps Location Default"
								src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15443.468711413807!2d-90.78564257121703!3d14.606828551465225!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8589078491321703%3A0xe6a8a2524458f3de!2sAFE%20Resort%20%26%20Spa!5e0!3m2!1ses-419!2sgt!4v1716654000000!5m2!1ses-419!2sgt" 
								class="w-full h-full border-0 rounded-[26px] opacity-90 group-hover:opacity-100 transition-opacity" 
								allowfullscreen={true} 
								loading="lazy" 
								referrerpolicy="no-referrer-when-downgrade"
							></iframe>
						{/if}
					</div>
				</div>

			</div>
		</div>
	</section>

	<!-- CTA Footer -->
	<PublicFooter />
</div>

<style>

	/* CSS Variables for Light / Dark Mode */
	:global(html) {
		--bg-main: #f8fafc;
		--bg-alt: #ffffff;
		--text-main: #0f172a;
		--text-muted: #64748b;
		--border-light: rgba(0,0,0,0.1);
		--nav-rgba: rgba(255, 255, 255, 0.85);
		--card-bg: #ffffff;
		--footer-bg: #f1f5f9;
		--footer-grad: linear-gradient(to bottom, #ffffff, #f1f5f9);
		--glass-bg: rgba(255, 255, 255, 0.9);
		--btn-glass-bg: rgba(0, 0, 0, 0.05);
		--btn-glass-hover: rgba(0, 0, 0, 0.1);
		--btn-glass-border: rgba(0, 0, 0, 0.1);
		--btn-glass-text: #0f172a;
	}
	:global(html.dark) {
		--bg-main: #0B0E14;
		--bg-alt: #0f131a;
		--text-main: #ffffff;
		--text-muted: #94a3b8;
		--border-light: rgba(255,255,255,0.05);
		--nav-rgba: rgba(11, 14, 20, 0.85);
		--card-bg: #0B0E14;
		--footer-bg: #0B0E14;
		--footer-grad: linear-gradient(to bottom, #0f131a, #0B0E14);
		--glass-bg: rgba(11, 14, 20, 0.9);
		--btn-glass-bg: rgba(255, 255, 255, 0.1);
		--btn-glass-hover: rgba(255, 255, 255, 0.2);
		--btn-glass-border: rgba(255, 255, 255, 0.2);
		--btn-glass-text: #ffffff;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background: var(--bg-main);
		overflow-x: hidden;
	}

	.luxury-landing {
		font-family: 'Inter', sans-serif;
		color: var(--text-main);
		min-height: 100vh;
		background: var(--bg-main);
	}

	h1, h2, h3, h4, .brand-accent {
		font-family: 'Outfit', sans-serif;
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 5%;
	}

	/* Micro Animations & Reveals */
	.fade-up-delay { animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
	.fade-up-delay-2 { animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; opacity: 0; }
	
	.fade-in-slow {
		animation: fadeInSlow 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		opacity: 0;
	}

	.reveal {
		opacity: 0;
		transform: translateY(40px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	:global(.reveal.active) {
		opacity: 1;
		transform: translateY(0);
	}

	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(30px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes fadeInSlow {
		from { opacity: 0; transform: translateY(12px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes shimmer {
		100% {
			transform: translateX(100%);
		}
	}

	@keyframes floatElement {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-12px); }
	}
	.animate-float {
		animation: floatElement 6s ease-in-out infinite;
	}

	/* Glass Navbar */
	.glass-navbar {
		position: fixed;
		top: 0; left: 0; right: 0;
		z-index: 1000;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 5%;
		transition: all 0.4s ease;
		border-bottom: 1px solid transparent;
	}
	.glass-navbar.scrolled {
		background: var(--nav-rgba);
		backdrop-filter: blur(12px);
		padding: 1rem 5%;
		border-bottom: 1px solid var(--border-light);
	}
	.nav-brand {
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--text-main);
	}
	.brand-accent {
		font-weight: 800;
		color: #D4AF37; /* Luxury Gold */
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	.nav-link {
		color: var(--text-muted);
		text-decoration: none;
		font-weight: 500;
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 1px;
		transition: color 0.3s;
	}
	.nav-link:hover { color: var(--text-main); }

	.btn-gold {
		background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%);
		color: #0B0E14;
		padding: 0.75rem 1.75rem;
		border-radius: 2px;
		text-transform: uppercase;
		font-weight: 700;
		font-size: 0.85rem;
		letter-spacing: 1px;
		text-decoration: none;
		transition: transform 0.3s, box-shadow 0.3s;
	}
	.btn-gold:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(212, 175, 55, 0.3);
	}

	.btn-glass {
		background: var(--btn-glass-bg);
		backdrop-filter: blur(10px);
		border: 1px solid var(--btn-glass-border);
		color: var(--btn-glass-text);
		padding: 0.75rem 1.75rem;
		border-radius: 2px;
		text-decoration: none;
		font-weight: 600;
		transition: all 0.3s;
	}
	.btn-glass:hover {
		background: var(--btn-glass-hover);
	}

	/* Hero Cinematic */
	.hero-cinematic {
		position: relative;
		height: 100vh;
		min-height: 800px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		overflow: hidden;
	}
	.hero-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
	}
	.parallax-video {
		width: 100%;
		height: 130%; /* Extra height for parallax */
		object-fit: cover;
		position: absolute;
		top: -15%;
	}
	.gradient-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg, 
			rgba(11, 14, 20, 0.7) 0%, 
			rgba(11, 14, 20, 0.3) 50%, 
			rgba(11, 14, 20, 1) 100%
		);
	}

	.hero-content {
		position: relative;
		z-index: 10;
		text-align: center;
		max-width: 900px;
		padding: 0 20px;
		margin-top: -10vh;
	}
	.badge {
		display: inline-block;
		text-transform: uppercase;
		letter-spacing: 4px;
		font-size: 0.75rem;
		border: 1px solid rgba(212, 175, 55, 0.5);
		color: #D4AF37;
		padding: 0.5rem 1rem;
		margin-bottom: 2rem;
		border-radius: 50px;
		backdrop-filter: blur(4px);
	}
	.title-display {
		font-size: clamp(4rem, 8vw, 7rem);
		font-weight: 300;
		line-height: 1.1;
		margin: 0 0 1.5rem;
		color: white;
		letter-spacing: -2px;
	}
	.title-display span {
		font-style: italic;
		color: #D4AF37;
	}
	.subtitle {
		font-size: 1.25rem;
		font-weight: 300;
		color: rgba(255, 255, 255, 0.85);
		max-width: 600px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* The Crystal Monolith Interface */
	.booking-monolith-container {
		position: absolute;
		bottom: 8%;
		z-index: 100;
		width: 90%;
		max-width: 1100px;
		background: rgba(255, 255, 255, 0.05);
		backdrop-filter: blur(30px) saturate(150%);
		-webkit-backdrop-filter: blur(30px) saturate(150%);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 2rem;
		box-shadow: 
			0 30px 60px -12px rgba(0,0,0,0.5),
			inset 0 0 0 1px rgba(255,255,255,0.1);
		transition: transform 0.15s ease-out, box-shadow 0.4s ease;
	}
	.booking-monolith-container:hover {
		box-shadow: 
			0 40px 80px -12px rgba(0,0,0,0.6),
			inset 0 0 0 1px rgba(255,255,255,0.2);
	}
	.monolith-form {
		display: flex;
		align-items: stretch;
		width: 100%;
	}
	.monolith-segment {
		flex: 1;
		min-width: 150px;
		position: relative;
		padding: 1.5rem 2rem;
		cursor: pointer;
		transition: all 0.4s ease;
	}
	.dates-segment {
		flex: 1.5;
		min-width: 320px;
	}
	.segment-content {
		position: relative;
		z-index: 2;
	}
	.segment-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at center, rgba(212, 175, 55, 0.15), transparent 70%);
		opacity: 0;
		transition: opacity 0.4s ease;
	}
	.monolith-segment:hover .segment-glow,
	.monolith-segment:focus-within .segment-glow {
		opacity: 1;
	}
	.monolith-segment label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 2.5px;
		color: #D4AF37;
		font-weight: 800;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		opacity: 0.8;
		transition: opacity 0.3s;
	}
	.monolith-segment:hover label { opacity: 1; }
	.monolith-segment input, .monolith-segment select {
		display: none;
	}
	.monolith-segment input[type="date"]::-webkit-calendar-picker-indicator {
		filter: invert(1) brightness(0.8) sepia(100%) saturate(200%) hue-rotate(10deg);
	}
	.monolith-segment select option {
		background-color: #0B0E14;
		color: white;
	}
	.segment-divider {
		position: absolute;
		right: 0;
		top: 25%;
		bottom: 25%;
		width: 1px;
		background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent);
	}
	.monolith-action {
		padding: 0 2rem 0 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.btn-monolith {
		background: #D4AF37;
		color: #0B0E14;
		border: none;
		padding: 1rem 3rem;
		border-radius: 1.5rem;
		font-family: 'Outfit';
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 2px;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 1rem;
		transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}
	.btn-monolith:hover {
		transform: scale(0.98);
		background: #fff;
		box-shadow: 0 0 30px rgba(255,255,255,0.2);
	}

	/* Experience Section */
	.experience-section {
		padding: 8rem 0;
		background: var(--bg-main);
	}
	.layout-split {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6rem;
		align-items: center;
	}
	.section-label {
		color: #D4AF37;
		font-size: 0.85rem;
		letter-spacing: 3px;
		margin-bottom: 1rem;
	}
	.split-text h2 {
		font-size: 3.5rem;
		line-height: 1.1;
		margin-bottom: 2rem;
		color: var(--text-main);
		font-weight: 300;
	}
	.split-text p {
		color: var(--text-muted);
		font-size: 1.1rem;
		line-height: 1.8;
		margin-bottom: 2.5rem;
	}
	.luxury-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.luxury-list li {
		margin-bottom: 1rem;
		font-size: 1.1rem;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.luxury-list li span { color: #D4AF37; font-size: 0.8rem; }
	
	/* Redesigned Essence Image Section Uses Tailwind Classes */

	/* Suites */
	.suites-section {
		padding: 8rem 0;
		background: var(--bg-alt);
	}
	.text-center { text-align: center; }
	.section-header { margin-bottom: 4rem; }
	.section-header h2 { font-size: 3rem; font-weight: 300; margin: 0; }
	
	/* Redesigned Suites Carousel Uses Tailwind Classes */

	/* Footer CTA */
	.luxury-footer {
		background: var(--bg-main);
		border-top: 1px solid var(--border-light);
	}
	.footer-cta {
		text-align: center;
		padding: 6rem 5%;
		background: var(--footer-grad);
	}
	.footer-cta h2 { font-size: 3.5rem; font-weight: 300; margin: 0 0 1rem; }
	.footer-cta p { color: var(--text-muted); font-size: 1.1rem; margin-bottom: 3rem; }
	.btn-gold-large {
		background: #D4AF37;
		color: #0B0E14;
		padding: 1.25rem 3rem;
		font-family: 'Outfit';
		font-size: 1.2rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 2px;
		text-decoration: none;
		border-radius: 2px;
		transition: all 0.3s;
	}
	.btn-gold-large:hover {
		background: #efcd5c;
		box-shadow: 0 0 30px rgba(212, 175, 55, 0.4);
	}

	.footer-grid {
		max-width: 1400px;
		margin: 0 auto;
		padding: 4rem 5%;
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr;
		gap: 4rem;
		border-top: 1px solid var(--border-light);
	}
	.footer-grid h4 {
		color: var(--text-main);
		text-transform: uppercase;
		letter-spacing: 2px;
		margin-bottom: 1.5rem;
	}
	.brand-col .h3 { font-size: 2rem; color: var(--text-main); }
	.brand-col { margin-top: -0.5rem; }
	.address { color: #64748b; margin-top: 1rem; line-height: 1.6; }
	.links-col a, .social-links a {
		display: block;
		color: var(--text-muted);
		text-decoration: none;
		margin-bottom: 1rem;
		transition: color 0.3s;
	}
	.links-col a:hover, .social-links a:hover { color: #D4AF37; }
	.footer-copy {
		text-align: center;
		padding: 2rem;
		color: #475569;
		font-size: 0.85rem;
		border-top: 1px solid var(--border-light);
	}

	.loader-container { display: flex; justify-content: center; padding: 4rem; }
	.spinner { width: 40px; height: 40px; border: 3px solid rgba(212, 175, 55, 0.3); border-top-color: #D4AF37; border-radius: 50%; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	/* Animaciones Creativas para Experiencias */
	.video-mask-container {
		transition: all 1s ease-in-out;
		animation: morphShape 15s ease-in-out infinite alternate;
	}
	@keyframes morphShape {
		0% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
		25% { border-radius: 58% 42% 75% 25% / 76% 46% 54% 24%; }
		50% { border-radius: 50% 50% 33% 67% / 55% 27% 73% 45%; }
		75% { border-radius: 33% 67% 58% 42% / 63% 68% 32% 37%; }
		100% { border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%; }
	}
	
	.floating-image-decorator {
		animation: floatImage 8s ease-in-out infinite;
	}
	@keyframes floatImage {
		0% { transform: translateY(0px) rotate(-2deg); }
		50% { transform: translateY(-20px) rotate(1deg); }
		100% { transform: translateY(0px) rotate(-2deg); }
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.layout-split { grid-template-columns: 1fr; gap: 4rem; }
		.suites-carousel { grid-template-columns: repeat(2, 1fr); }
		.monolith-form { flex-direction: column; }
		.monolith-segment { padding: 1.25rem 2rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
		.segment-divider { display: none; }
		.btn-monolith { padding: 1rem 2rem; width: 100%; justify-content: center; border-radius: 2rem; margin-top: 1rem; }
		.monolith-action { padding: 1.5rem; }
		.booking-monolith-container { position: relative; bottom: 0; margin-top: 3rem; transform: none !important; border-radius: 2.5rem; }
		.footer-grid { grid-template-columns: 1fr; gap: 2rem; }
	}

	/* Estilos Premium para Preguntas Frecuentes (FAQ) */
	.faq-section {
		background: var(--bg-main);
		margin-top: -1px;
	}
	.faq-item {
		transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.faq-item:hover {
		transform: translateY(-2px);
		border-color: rgba(212, 175, 55, 0.3) !important;
	}
	.faq-item button {
		outline: none;
	}

	/* Estilos Premium para Sección Encuéntranos (Mapa y Contacto) */
	.find-us-section {
		background: var(--bg-alt);
		margin-top: -1px;
	}
	
	/* Efecto de pulido e interacción en el mapa iframe */
	.find-us-section iframe {
		transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
		filter: grayscale(10%) contrast(100%);
	}
	.find-us-section .group:hover iframe {
		filter: grayscale(0%) contrast(105%);
		transform: scale(1.005);
	}

	/* Alineación y Fondos Consistentes para Momentos Únicos */
	.immersive-experiences {
		background: var(--bg-alt);
		margin-top: -1px;
	}

	/* Alineación y Fondos Consistentes para Amenidades */
	.amenities-section {
		background: var(--bg-main);
		margin-top: -1px;
	}
</style>
