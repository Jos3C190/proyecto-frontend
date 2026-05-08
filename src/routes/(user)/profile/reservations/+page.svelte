<script lang="ts">
	import { getMyReservations } from '$lib/services/reservation.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import { onMount } from 'svelte';
	import { fade, fly, slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

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
	let activeTab = $state<'all' | 'upcoming' | 'past' | 'cancelled' | 'verifying'>(initialState.activeTab);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			activeTab
		});
	});

	onMount(async () => {
		try {
			reservations = await getMyReservations();
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
		if (activeTab === 'upcoming') {
			list = reservations.filter(r => isUpcoming(r.check_in) && r.status !== 'CANCELLED');
		} else if (activeTab === 'past') {
			list = reservations.filter(r => !isUpcoming(r.check_in) && r.status !== 'CANCELLED');
		} else if (activeTab === 'cancelled') {
			list = reservations.filter(r => r.status.toUpperCase() === 'CANCELLED');
		} else if (activeTab === 'verifying') {
			list = reservations.filter(r => r.status.toLowerCase() === 'verifying');
		}
		// Sort by check-in date descending
		return [...list].sort((a, b) => parseLocalDate(b.check_in).getTime() - parseLocalDate(a.check_in).getTime());
	});

	const stats = $derived({
		upcoming: reservations.filter(r => isUpcoming(r.check_in) && !['CANCELLED', 'verifying'].includes(r.status)).length,
		past: reservations.filter(r => !isUpcoming(r.check_in) && !['CANCELLED', 'verifying'].includes(r.status)).length,
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
			<img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop" alt="Background" />
			<div class="overlay"></div>
		</div>
		<div class="hero-content">
			<span class="badge-gold">MI PORTAL</span>
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
								<div class="nights-badge">
									{calculateNights(res.check_in, res.check_out)} Noches
								</div>
							</div>

							<div class="res-body">
								<div class="res-header">
									<div class="res-meta">
										<span class="id-tag">REF: {res.unique_id.split('-')[0].toUpperCase()}</span>
										<span class="date-range">
											{parseLocalDate(res.check_in).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} 
											- 
											{parseLocalDate(res.check_out).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
										</span>
									</div>
									<div class="status-badge {res.status.toLowerCase()}">
										{res.status}
									</div>
								</div>

								<h2 class="room-title">Suite {res.room?.type} <span class="number">#{res.room?.number}</span></h2>
								
								<div class="res-features">
									<div class="feature">
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
										<span>Capacidad: {res.room?.capacity}</span>
										
									</div>
									
								</div>

								<div class="res-footer">
									<div class="pricing">
										<div class="price-item">
											<span class="label">Total</span>
											<span class="value">${res.total_cost}</span>
										</div>
										{#if (res.balance || 0) > 0}
											<div class="price-item warning">
												<span class="label">Pendiente</span>
												<span class="value">${res.balance}</span>
											</div>
										{/if}
									</div>
									<div class="actions">
										<a href="/reservations/summary/{res.id}" class="btn-detail">
											Detalle <span>&rarr;</span>
										</a>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}

				{#if filteredReservations().length === 0}
					<div class="no-results" in:fade>
						<p>No hay reservaciones en esta categoría.</p>
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
		height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		text-align: center;
		margin-top: -4rem; 
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
		filter: brightness(0.5) contrast(1.1);
		transition: filter 0.5s ease;
	}
	:global(html:not(.dark)) .hero-bg img {
		filter: brightness(0.7) contrast(1.05);
	}

	.overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.4); /* Solid subtle overlay instead of gradient */
	}
	.hero-content {
		position: relative;
		z-index: 10;
		max-width: 800px;
		padding: 0 2rem;
	}
	.badge-gold {
		display: inline-block;
		padding: 0.5rem 1.25rem;
		background: rgba(212, 175, 55, 0.2);
		border: 1px solid var(--gold);
		color: var(--gold);
		font-family: 'Outfit';
		font-weight: 700;
		font-size: 0.75rem;
		letter-spacing: 2px;
		border-radius: 50px;
		margin-bottom: 1.5rem;
	}
	.hero-content h1 {
		font-family: 'Outfit';
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 300;
		line-height: 1.1;
		margin-bottom: 1rem;
		color: white;
	}
	.text-gold { color: var(--gold); font-italic: italic; }
	.hero-content p {
		font-size: 1.1rem;
		color: rgba(255,255,255,0.7);
		font-weight: 300;
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
		margin: -35px auto 4rem; /* Solapamiento de 35px sobre el Hero */
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

	.res-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}
	.res-meta { display: flex; flex-direction: column; gap: 0.1rem; }
	.id-tag {
		font-size: 0.6rem;
		letter-spacing: 1.5px;
		font-weight: 800;
		color: var(--gold);
		opacity: 0.8;
	}

	.date-range { font-size: 0.85rem; font-weight: 700; color: var(--text-main); }
	.status-badge { 
		padding: 0.25rem 0.6rem; 
		font-size: 0.55rem; 
		border-radius: 6px;
		text-transform: uppercase;
		font-weight: 900;
		letter-spacing: 0.5px;
	}
	.status-badge.confirmed { background: #dcfce7; color: #166534; }
	.status-badge.pending { background: #fef9c3; color: #854d0e; }
	.status-badge.verifying { background: #ffedd5; color: #9a3412; }
	.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
	:global(.dark) .status-badge.confirmed { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
	:global(.dark) .status-badge.pending { background: rgba(234, 179, 8, 0.2); color: #facc15; }
	:global(.dark) .status-badge.verifying { background: rgba(249, 115, 22, 0.2); color: #fb923c; }
	:global(.dark) .status-badge.cancelled { background: rgba(239, 68, 68, 0.2); color: #f87171; }

	.room-title {
		font-size: 1.1rem;
		margin-bottom: 0.75rem;
		font-weight: 600;
		font-family: 'Outfit';
	}
	.room-title .number { color: var(--gold); font-weight: 800; margin-left: 4px; }

	.res-features {
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem 0;
		border-top: 1px solid var(--border-light);
		border-bottom: 1px solid var(--border-light);
	}
	.feature { font-size: 0.75rem; }

	.res-footer {
		margin-top: auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1.25rem;
		border-top: 1px solid var(--border-light);
	}

	.pricing { display: flex; gap: 1.5rem; }
	.price-item { display: flex; flex-direction: column; gap: 0.1rem; }
	.price-item .label { font-size: 0.55rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); font-weight: 800; }
	.price-item .value { font-family: 'Outfit'; font-size: 1.1rem; font-weight: 800; color: var(--text-main); }
	.price-item.warning .value { color: #dc2626; }

	.btn-detail {
		background: var(--gold);
		color: #0B0E14;
		padding: 0.6rem 1rem;
		border-radius: 8px;
		font-family: 'Outfit';
		font-weight: 800;
		font-size: 0.7rem;
		text-transform: uppercase;
		text-decoration: none;
		transition: all 0.3s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid var(--gold);
	}
	.btn-detail:hover {
		background: transparent;
		color: var(--gold);
		box-shadow: 0 5px 15px rgba(212, 175, 55, 0.2);
	}
	.btn-detail span { font-size: 1rem; }

	@media (max-width: 768px) {
		.reservations-grid { grid-template-columns: 1fr; }
		.tabs-scroll { gap: 1.5rem; }
	}
</style>

