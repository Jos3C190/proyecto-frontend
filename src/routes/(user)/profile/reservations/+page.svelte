<script lang="ts">
	import { getMyReservations } from '$lib/services/reservation.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { fetchPublicSettings } from '$lib/services/settings.service';

	import { createPersistence } from '$lib/utils/persistence';

	const persistence = createPersistence({
		key: 'user_reservations',
		defaultValues: {
			activeTab: 'all'
		}
	});

	const initialState = persistence.getInitialState();

	let reservations = $state<ReservationRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let activeTab = $state<'all' | 'pending' | 'upcoming' | 'past' | 'cancelled' | 'verifying'>(initialState.activeTab);
	let heroImage = $state('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop');

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			activeTab
		});
	});

	onMount(async () => {
		try {
			const [reservationsRes, settingsRes] = await Promise.all([
				getMyReservations(),
				fetchPublicSettings()
			]);
			reservations = reservationsRes;
			if (settingsRes.hero_image_reservations) {
				heroImage = settingsRes.hero_image_reservations;
			}
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	// Helper to parse YYYY-MM-DD as local date instead of UTC
	function parseLocalDate(dateStr: string) {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	function calculateNights(checkIn: string, checkOut: string) {
		const start = parseLocalDate(checkIn);
		const end = parseLocalDate(checkOut);
		const diff = end.getTime() - start.getTime();
		return Math.max(1, Math.ceil(diff / (1000 * 3600 * 24)));
	}

	function isUpcoming(checkIn: string) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return parseLocalDate(checkIn) >= today;
	}

	let filteredReservations = $derived(() => {
		let list = reservations;
		if (activeTab === 'pending') {
			list = reservations.filter(r => r.status.toLowerCase() === 'pending');
		} else if (activeTab === 'upcoming') {
			list = reservations.filter(r => isUpcoming(r.check_in) && r.status.toLowerCase() === 'confirmed');
		} else if (activeTab === 'past') {
			list = reservations.filter(r => !isUpcoming(r.check_in) && !['cancelled', 'pending', 'verifying'].includes(r.status.toLowerCase()));
		} else if (activeTab === 'cancelled') {
			list = reservations.filter(r => r.status.toUpperCase() === 'CANCELLED');
		} else if (activeTab === 'verifying') {
			list = reservations.filter(r => r.status.toLowerCase() === 'verifying');
		}
		// Sort by check-in date descending
		return [...list].sort((a, b) => parseLocalDate(b.check_in).getTime() - parseLocalDate(a.check_in).getTime());
	});

	const stats = $derived({
		pending: reservations.filter(r => r.status.toLowerCase() === 'pending').length,
		upcoming: reservations.filter(r => isUpcoming(r.check_in) && r.status.toLowerCase() === 'confirmed').length,
		past: reservations.filter(r => !isUpcoming(r.check_in) && !['cancelled', 'pending', 'verifying'].includes(r.status.toLowerCase())).length,
		cancelled: reservations.filter(r => r.status.toUpperCase() === 'CANCELLED').length,
		verifying: reservations.filter(r => r.status.toLowerCase() === 'verifying').length
	});
</script>

<svelte:head>
	<title>Mis Experiencias | AFE Resort & Spa</title>
</svelte:head>

<div class="luxury-page-container">
	<!-- Hero Section -->
	<header class="luxury-hero">
		<div class="hero-bg">
			<img src={heroImage} alt="Background" class="ken-burns" />
			<div class="overlay"></div>
		</div>
		<div class="hero-content">
			<h1>Mis <span class="text-gold">Reservaciones</span></h1>
			<p>Revive tus memorias o prepárate para tu próxima gran experiencia en el paraíso.</p>
		</div>
	</header>

	<div class="tabs-overlap-container">
		<div class="tabs-pill-container">
			<button 
				class="pill-btn {activeTab === 'all' ? 'active' : ''}" 
				onclick={() => activeTab = 'all'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg>
				Todas <span class="count">{reservations.length}</span>
			</button>
			<button 
				class="pill-btn {activeTab === 'pending' ? 'active' : ''}" 
				onclick={() => activeTab = 'pending'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round"/></svg>
				Pendientes <span class="count">{stats.pending}</span>
			</button>
			<button 
				class="pill-btn {activeTab === 'upcoming' ? 'active' : ''}" 
				onclick={() => activeTab = 'upcoming'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round"/></svg>
				Próximas <span class="count">{stats.upcoming}</span>
			</button>
			<button 
				class="pill-btn {activeTab === 'verifying' ? 'active' : ''}" 
				onclick={() => activeTab = 'verifying'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round"/></svg>
				En revisión <span class="count">{stats.verifying}</span>
			</button>
			<button 
				class="pill-btn {activeTab === 'past' ? 'active' : ''}" 
				onclick={() => activeTab = 'past'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round"/></svg>
				Pasadas <span class="count">{stats.past}</span>
			</button>
			<button 
				class="pill-btn {activeTab === 'cancelled' ? 'active' : ''}" 
				onclick={() => activeTab = 'cancelled'}
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/></svg>
				Canceladas <span class="count">{stats.cancelled}</span>
			</button>
		</div>
	</div>

	<main class="content-wrapper">

		{#if loading}
			<div class="loading-state">
				<div class="spinner"></div>
			</div>
		{:else if error}
			<div class="error-state glass-card" in:fade>
				<div class="error-icon">⚠️</div>
				<p>{error}</p>
			</div>
		{:else if reservations.length === 0}
			<div class="empty-state glass-card" in:fade>
				<div class="empty-illustration">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 mx-auto opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="0.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
					</svg>
				</div>
				<h3>El paraíso te espera</h3>
				<p>Aún no has comenzado tu historia con nosotros. ¿Por qué no empezar hoy?</p>
				<a href="/rooms" class="btn-gold-action">Explorar Suites</a>
			</div>
		{:else}
			<div class="reservations-grid">
				{#each filteredReservations() as res, i (res.id)}
					<div 
						class="res-card-wrapper" 
						in:fly={{ y: 20, delay: i * 100, duration: 600, easing: cubicOut }}
					>
						<div class="res-card glass-card">
							<div class="res-image">
								{#if res.room?.cover_image_url}
									<img src={res.room.cover_image_url} alt={res.room.type} />
								{:else if res.room?.images && res.room.images.length > 0}
									<img src={res.room.images[0].url} alt={res.room.type} />
								{:else}
									<img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80" alt="Default Room" />
								{/if}
								
								<div class="absolute top-3 right-3 z-10">
									<span class="status-badge {res.status.toLowerCase()}">
										{res.status}
									</span>
								</div>

								<div class="nights-badge">
									{calculateNights(res.check_in, res.check_out)} {calculateNights(res.check_in, res.check_out) === 1 ? 'Noche' : 'Noches'}
								</div>
							</div>

							<div class="res-body">
								<!-- Reference & Dates -->
								<div class="res-top-info">
									<span class="id-tag">REF: {res.unique_id.split('-')[0].toUpperCase()}</span>
									<div class="date-display">
										<svg class="w-3.5 h-3.5 text-[#D4AF37]" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
										</svg>
										<span class="date-range">
											{parseLocalDate(res.check_in).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} 
											- 
											{parseLocalDate(res.check_out).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
										</span>
									</div>
								</div>

								<h2 class="room-title">Suite {res.room?.type} <span class="number">#{res.room?.number}</span></h2>
								
								<!-- Room Info Rows -->
								<div class="res-features">
									<div class="feature-badge" title="Huéspedes en la reserva">
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
										</svg>
										<span>{res.guests} {res.guests === 1 ? 'Huésped' : 'Huéspedes'}</span>
									</div>
									
									<div class="feature-badge" title="Capacidad máxima de la habitación">
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
										</svg>
										<span>Capacidad: {res.room?.capacity}</span>
									</div>
								</div>

								<!-- Clean Pricing Breakdown Container -->
								<div class="pricing-breakdown">
									<div class="price-row">
										<span class="price-label">Tarifa Habitación</span>
										<span class="price-value font-medium">${Number(res.total_cost).toFixed(2)}</span>
									</div>
									
									{#if Number(res.extras_total || 0) > 0}
										<div class="price-row extras">
											<span class="price-label">Servicios Extras (c/IVA)</span>
											<span class="price-value font-semibold text-fuchsia-600 dark:text-fuchsia-400">+${(Number(res.extras_total) * 1.13).toFixed(2)}</span>
										</div>
									{/if}
									
									{#if Number(res.incidentals_total || 0) > 0}
										<div class="price-row incidentals">
											<span class="price-label">Cargos Incidentales (c/IVA)</span>
											<span class="price-value font-semibold text-amber-600 dark:text-amber-400">+${(Number(res.incidentals_total) * 1.13).toFixed(2)}</span>
										</div>
									{/if}
									
									<div class="price-divider"></div>
									
									<div class="price-row grand-total">
										<span class="price-label font-bold text-slate-800 dark:text-white">Total General</span>
										<span class="price-value font-black text-lg text-[#D4AF37]">${Number(res.grand_total ?? res.total_cost).toFixed(2)}</span>
									</div>
									
									{#if (res.balance || 0) > 0}
										<div class="price-row pending-balance">
											<span class="price-label text-red-600 dark:text-red-400 font-semibold">Saldo Pendiente</span>
											<span class="price-value font-bold text-red-600 dark:text-red-400">${Number(res.balance).toFixed(2)}</span>
										</div>
									{/if}
								</div>

								<!-- Footer Actions -->
								<div class="res-card-footer">
									<a href="/reservations/summary/{res.id}" class="btn-detail-full">
										<span>Ver Detalles de Reserva</span>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
										</svg>
									</a>
								</div>
							</div>
						</div>
					</div>
				{/each}

				{#if filteredReservations().length === 0}
					<div class="no-results glass-card text-center py-12 px-6" in:fade>
						<div class="no-results-icon mb-4">
							{#if activeTab === 'pending'}
								<!-- Success checkmark / spark circle -->
								<svg class="h-16 w-16 mx-auto text-emerald-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							{:else if activeTab === 'verifying'}
								<!-- Safe shield / document -->
								<svg class="h-16 w-16 mx-auto text-blue-500/80 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							{:else if activeTab === 'upcoming'}
								<!-- Compass / Explore map -->
								<svg class="h-16 w-16 mx-auto text-[#D4AF37] opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
								</svg>
							{:else if activeTab === 'past'}
								<!-- Sparkles / memory -->
								<svg class="h-16 w-16 mx-auto text-indigo-500/80 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
								</svg>
							{:else if activeTab === 'cancelled'}
								<!-- Shield-off / calm -->
								<svg class="h-16 w-16 mx-auto text-slate-400 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							{:else}
								<!-- Calendar / folder -->
								<svg class="h-16 w-16 mx-auto text-slate-400 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							{/if}
						</div>
						
						<h3 class="font-['Outfit'] text-xl font-light text-slate-800 dark:text-white mb-2">
							{#if activeTab === 'pending'}
								¡Al día con tus pagos!
							{:else if activeTab === 'verifying'}
								Todo bajo control
							{:else if activeTab === 'upcoming'}
								¿Planeando tu próximo escape?
							{:else if activeTab === 'past'}
								Nuevos horizontes por descubrir
							{:else if activeTab === 'cancelled'}
								Sin novedades por aquí
							{:else}
								Sin reservaciones
							{/if}
						</h3>
						
						<p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
							{#if activeTab === 'pending'}
								No tienes reservaciones con saldo pendiente de pago. ¡Todo listo para tu llegada!
							{:else if activeTab === 'verifying'}
								No hay pagos en proceso de verificación por nuestro equipo administrativo en este momento.
							{:else if activeTab === 'upcoming'}
								No tienes reservaciones próximas confirmadas. Explora nuestras suites y planifica tu escape perfecto.
							{:else if activeTab === 'past'}
								Aún no tienes reservaciones completadas en tu historial. ¡Comencemos hoy!
							{:else if activeTab === 'cancelled'}
								No tienes reservaciones canceladas en tu cuenta. ¡Excelente!
							{:else}
								No hemos encontrado reservaciones registradas en esta categoría.
							{/if}
						</p>

						{#if activeTab === 'upcoming' || activeTab === 'all' || activeTab === 'past'}
							<a href="/rooms" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA8222] text-slate-950 text-xs font-black uppercase tracking-widest transition-all shadow-md shadow-[#D4AF37]/15 hover:shadow-lg hover:shadow-[#D4AF37]/30 hover:scale-[1.02]">
								Explorar Suites
							</a>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</main>
</div>

<style>
	:global(html) {
		--gold: #D4AF37;
		--gold-dark: #AA8222;
		--bg-main: #f8fafc;
		--text-main: #0f172a;
		--text-muted: #64748b;
		--border-light: rgba(0,0,0,0.08);
	}
	:global(html.dark) {
		--bg-main: #0B0E14;
		--text-main: #ffffff;
		--text-muted: #94a3b8;
		--border-light: rgba(255,255,255,0.08);
	}

	.luxury-page-container {
		min-height: 100vh;
		background: var(--bg-main);
		font-family: 'Inter', sans-serif;
		color: var(--text-main);
	}

	.loading-state {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 5rem 0;
		min-height: 200px;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 4px solid rgba(212, 175, 55, 0.1);
		border-top: 4px solid var(--gold);
		border-radius: 50%;
		animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Hero Section */
	.luxury-hero {
		position: relative;
		height: 45vh;
		min-height: 450px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		text-align: center;
		margin-top: -5rem; 
		padding-top: 5rem;
	}
	.hero-bg {
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	.hero-bg img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transform: scale(1.05);
		animation: kenburns-single 20s ease-in-out infinite alternate;
	}
	@keyframes kenburns-single {
		from { transform: scale(1.05); }
		to { transform: scale(1.2); }
	}
	.overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(11, 14, 20, 0.75), rgba(11, 14, 20, 0.5));
		z-index: 1;
	}
	.hero-content {
		position: relative;
		z-index: 10;
		max-width: 800px;
		padding: 0 2rem;
	}
	.hero-content h1 {
		font-family: 'Outfit', sans-serif;
		font-size: 3.5rem;
		font-weight: 300;
		margin-bottom: 0.5rem;
		letter-spacing: -1px;
		color: white;
		line-height: 1.1;
	}
	.text-gold { color: var(--gold); }
	.hero-content p {
		font-size: 1.25rem;
		color: #cbd5e1;
		font-weight: 300;
		max-width: 700px;
		margin: 0 auto;
	}

	/* Content Wrapper */
	.content-wrapper {
		max-width: 1200px;
		margin: 0 auto 100px;
		padding: 0 2rem;
		position: relative;
		z-index: 20;
	}

	/* Tabs Overlap */
	.tabs-overlap-container {
		max-width: 1200px;
		margin: -40px auto 4rem; /* Solapamiento de 40px sobre el Hero */
		position: relative;
		z-index: 40;
		display: flex;
		justify-content: center;
		padding: 0 2rem;
	}

	/* Tabs Rediseñadas: Píldora Premium */
	.tabs-pill-container {
		background: white;
		border: 1px solid rgba(0,0,0,0.08);
		padding: 0.4rem;
		border-radius: 100px;
		display: flex;
		gap: 0.2rem;
		box-shadow: 0 15px 35px rgba(0,0,0,0.05);
		width: fit-content; /* No usar todo el ancho */
		max-width: 95%;
		overflow-x: auto;
		scrollbar-width: none;
	}
	:global(.dark) .tabs-pill-container {
		background: #1a1f2b;
		border-color: rgba(255,255,255,0.05);
		box-shadow: 0 15px 35px rgba(0,0,0,0.2);
	}
	.tabs-pill-container::-webkit-scrollbar { display: none; }

	.pill-btn {
		padding: 0.6rem 1.25rem;
		border-radius: 100px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		font-family: 'Outfit';
		font-weight: 700;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		white-space: nowrap;
	}
	
	.pill-btn:hover { color: var(--text-main); background: rgba(0,0,0,0.03); }
	:global(.dark) .pill-btn:hover { background: rgba(255,255,255,0.05); }
	
	.pill-btn.active {
		background: var(--gold);
		color: #0B0E14;
		box-shadow: 0 8px 20px rgba(212, 175, 55, 0.25);
	}

	.pill-btn svg {
		opacity: 0.7;
	}
	.pill-btn.active svg {
		opacity: 1;
	}

	.count {
		font-size: 0.65rem;
		background: rgba(0,0,0,0.05);
		padding: 0.1rem 0.5rem;
		border-radius: 8px;
		font-weight: 800;
		opacity: 0.8;
	}
	.pill-btn.active .count { background: rgba(0,0,0,0.1); }

	/* Grid de Reservaciones Compacto */
	.reservations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 2rem;
		padding-bottom: 4rem;
	}

	.res-card {
		display: flex;
		flex-direction: column; /* Cambiado a columna para ser más compacto en grid */
		border-radius: 20px;
		overflow: hidden;
		background: white;
		border: 1px solid var(--border-light);
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		height: 100%;
	}
	:global(.dark) .res-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); }

	.res-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 20px 40px rgba(0,0,0,0.08);
		border-color: var(--gold);
	}

	.res-image {
		width: 100%;
		height: 180px; /* Un poco más pequeña */
		position: relative;
		overflow: hidden;
	}
	.res-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s ease;
	}
	.res-card:hover .res-image img { transform: scale(1.05); }

	.nights-badge {
		position: absolute;
		bottom: 1rem;
		right: 1rem;
		background: rgba(0,0,0,0.7);
		backdrop-filter: blur(8px);
		color: white;
		padding: 0.3rem 0.8rem;
		border-radius: 50px;
		font-size: 0.65rem;
		font-weight: 700;
		border: 1px solid rgba(255,255,255,0.2);
		z-index: 5;
	}
	
	.res-body {
		padding: 1.25rem;
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.res-top-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.6rem;
	}
	
	.date-display {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: rgba(0,0,0,0.02);
		padding: 0.25rem 0.6rem;
		border-radius: 50px;
		border: 1px solid var(--border-light);
	}
	:global(.dark) .date-display {
		background: rgba(255,255,255,0.02);
	}

	.id-tag {
		font-size: 0.6rem;
		letter-spacing: 1.5px;
		font-weight: 800;
		color: var(--gold);
		opacity: 0.85;
	}

	.date-range { 
		font-size: 0.75rem; 
		font-weight: 700; 
		color: var(--text-main); 
	}

	.status-badge { 
		padding: 0.3rem 0.75rem; 
		font-size: 0.6rem; 
		border-radius: 8px;
		text-transform: uppercase;
		font-weight: 900;
		letter-spacing: 0.75px;
		backdrop-filter: blur(8px);
		box-shadow: 0 4px 10px rgba(0,0,0,0.15);
	}
	.status-badge.confirmed { background: rgba(220, 252, 231, 0.9); color: #166534; }
	.status-badge.pending { background: rgba(254, 249, 195, 0.9); color: #854d0e; }
	.status-badge.verifying { background: rgba(255, 237, 213, 0.9); color: #9a3412; }
	.status-badge.cancelled { background: rgba(254, 226, 226, 0.9); color: #991b1b; }
	:global(.dark) .status-badge.confirmed { background: rgba(34, 197, 94, 0.85); color: #022c22; }
	:global(.dark) .status-badge.pending { background: rgba(234, 179, 8, 0.85); color: #422006; }
	:global(.dark) .status-badge.verifying { background: rgba(249, 115, 22, 0.85); color: #431407; }
	:global(.dark) .status-badge.cancelled { background: rgba(239, 68, 68, 0.85); color: #450a0a; }

	.room-title {
		font-size: 1.1rem;
		margin-bottom: 0.75rem;
		font-weight: 600;
		font-family: 'Outfit';
	}
	.room-title .number { color: var(--gold); font-weight: 800; margin-left: 4px; }

	.res-features {
		display: flex;
		gap: 0.6rem;
		margin-bottom: 1.25rem;
		padding: 0.75rem 0;
		border-top: 1px solid var(--border-light);
		border-bottom: 1px solid var(--border-light);
		flex-wrap: wrap;
	}
	
	.feature-badge {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: var(--text-muted);
		background: rgba(0,0,0,0.02);
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		border: 1px solid var(--border-light);
	}
	:global(.dark) .feature-badge {
		background: rgba(255,255,255,0.02);
	}
	.feature-badge svg {
		color: var(--gold);
	}

	.pricing-breakdown {
		background: rgba(0,0,0,0.015);
		border-radius: 14px;
		padding: 0.85rem;
		border: 1px dashed var(--border-light);
		margin-bottom: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}
	:global(.dark) .pricing-breakdown {
		background: rgba(255,255,255,0.01);
	}
	.price-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.8rem;
	}
	.price-row .price-label {
		color: var(--text-muted);
		font-weight: 500;
	}
	.price-row .price-value {
		color: var(--text-main);
	}
	.price-divider {
		height: 1px;
		background: var(--border-light);
		margin: 0.2rem 0;
	}
	.price-row.grand-total {
		font-size: 0.85rem;
	}
	.price-row.grand-total .price-label {
		font-family: 'Outfit';
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.price-row.pending-balance {
		background: rgba(239, 68, 68, 0.05);
		padding: 0.4rem 0.6rem;
		border-radius: 8px;
		margin-top: 0.2rem;
		border: 1px solid rgba(239, 68, 68, 0.15);
	}
	:global(.dark) .price-row.pending-balance {
		background: rgba(239, 68, 68, 0.15);
	}

	.res-card-footer {
		margin-top: auto;
		padding-top: 0.5rem;
	}

	.btn-detail-full {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		background: linear-gradient(135deg, var(--gold) 0%, var(--gold-dark) 100%);
		color: #0B0E14;
		padding: 0.8rem;
		border-radius: 12px;
		font-family: 'Outfit';
		font-weight: 800;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.75px;
		text-decoration: none;
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		border: none;
		box-shadow: 0 4px 15px rgba(212, 175, 55, 0.15);
	}
	.btn-detail-full:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(212, 175, 55, 0.3);
		filter: brightness(1.1);
	}
	.btn-detail-full svg {
		transition: transform 0.3s;
	}
	.btn-detail-full:hover svg {
		transform: translateX(4px);
	}

	.no-results {
		grid-column: 1 / -1;
		border-radius: 24px;
		background: white;
		border: 1px solid var(--border-light);
		padding: 4rem 2rem;
		box-shadow: 0 10px 30px rgba(0,0,0,0.02);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	:global(.dark) .no-results {
		background: rgba(255, 255, 255, 0.02);
		backdrop-filter: blur(20px);
	}
	.no-results-icon svg {
		animation: float-slow 4s ease-in-out infinite;
	}
	@keyframes float-slow {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}

	@media (max-width: 768px) {
		.reservations-grid { grid-template-columns: 1fr; }
		.tabs-scroll { gap: 1.5rem; }
	}
</style>

