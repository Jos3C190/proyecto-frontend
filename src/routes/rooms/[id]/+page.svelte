<script lang="ts">
	import { page } from '$app/stores';
	import { getRoom } from '$lib/services/room.service';
	import type { RoomRead } from '$lib/types/room';
	import PublicFooter from '$lib/components/layout/PublicFooter.svelte';
	import { onMount, tick } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	
	let roomId = parseInt($page.params.id);
	let room = $state<RoomRead | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// URL Params if navigated from Search
	import { createPersistence } from '$lib/utils/persistence';

	const persistence = createPersistence({
		key: 'public_rooms',
		defaultValues: {
			checkIn: $page.url.searchParams.get('checkIn') || '',
			checkOut: $page.url.searchParams.get('checkOut') || '',
			guests: $page.url.searchParams.get('guests') || '2'
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

	let bookingUrl = $derived(
		`/reservations/new/${roomId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
	);

	// Calculation for Price Breakdown applying Season Multipliers
	let subtotal = $derived.by(() => {
		if (!room || !checkIn || !checkOut) return 0;
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		let current = new Date(start);
		let totalSubtotal = 0;

		while (current < end) {
			let multiplier = 1.0;
			const currentStr = current.toISOString().split('T')[0];
			
			// Find active season price for this specific date
			for (const sp of room.season_prices) {
				if (!sp.is_archived && currentStr >= sp.start_date && currentStr <= sp.end_date) {
					multiplier = Number(sp.price_multiplier);
					break;
				}
			}
			
			totalSubtotal += Number(room.base_price) * multiplier;
			current.setDate(current.getDate() + 1);
		}
		return totalSubtotal;
	});

	let numNights = $derived.by(() => {
		if (!checkIn || !checkOut) return 0;
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		const diff = end.getTime() - start.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	});

	// Average price per night for the header
	let displayPrice = $derived.by(() => {
		if (!room) return 0;
		if (numNights > 0) return subtotal / numNights;
		
		// If no dates selected, check if TODAY has a multiplier
		const todayStr = new Date().toISOString().split('T')[0];
		let multiplier = 1.0;
		for (const sp of room.season_prices) {
			if (!sp.is_archived && todayStr >= sp.start_date && todayStr <= sp.end_date) {
				multiplier = Number(sp.price_multiplier);
				break;
			}
		}
		return Number(room.base_price) * multiplier;
	});

	let iva = $derived(subtotal * 0.13);
	let tourism = $derived(subtotal * 0.05);
	let total = $derived(subtotal + iva + tourism);

	// Grid logic
	let gridImages = $derived.by(() => {
		if (!room) return [];
		let images: string[] = [];
		
		if (room.cover_image_url) {
			images.push(room.cover_image_url);
		}
		
		if (room.images) {
			room.images.forEach(img => {
				if (img.url !== room.cover_image_url) {
					images.push(img.url);
				}
			});
		}

		const placeholder = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2000&auto=format&fit=crop";
		while (images.length < 5) {
			images.push(placeholder);
		}
		return images.slice(0, 5);
	});

	onMount(async () => {
		try {
			room = await getRoom(roomId);
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>{room ? `${room.type.toUpperCase()} No. ${room.number}` : 'Cargando...'} | AFE Resort</title>
</svelte:head>

<main class="luxury-room-detail">
	{#if loading}
		<div class="loader-container">
			<div class="luxury-spinner"></div>
		</div>
	{:else if error}
		<div class="container error-view">
			<div class="error-card">
				<h2>Habitación no encontrada</h2>
				<p>{error}</p>
				<a href="/rooms" class="btn-luxury-outline">Explorar otras suites</a>
			</div>
		</div>
	{:else if room}
		<div class="container top-nav-details">
			<nav class="breadcrumbs">
				<a href="/">Inicio</a>
				<span>/</span>
				<a href="/rooms">Habitaciones</a>
				<span>/</span>
				<span class="current">{room.type}</span>
			</nav>
		</div>

		<div class="container main-title-section">
			<div class="badge">Suite Exclusiva</div>
			<h1>{room.type.toUpperCase()} <span class="number">No. {room.number}</span></h1>
			<div class="specs-bar">
				<span class="spec">👥 {room.capacity} Huéspedes</span>
				<span class="spec-dot">·</span>
				<span class="spec">🏷️ {room.type}</span>
				<span class="spec-dot">·</span>
				<span class="spec">✦ Desde ${room.base_price}/noche</span>
			</div>
		</div>

		<!-- Refined Bento Grid -->
		<div class="container">
			<div class="bento-photo-grid" in:fade={{ duration: 800 }}>
				<div class="grid-main">
					<img src={gridImages[0]} alt="Vista Principal" />
				</div>
				<div class="grid-side top-left">
					<img src={gridImages[1]} alt="Vista 2" />
				</div>
				<div class="grid-side top-right">
					<img src={gridImages[2]} alt="Vista 3" />
				</div>
				<div class="grid-side bottom-left">
					<img src={gridImages[3]} alt="Vista 4" />
				</div>
				<div class="grid-side bottom-right">
					<img src={gridImages[4]} alt="Vista 5" />
				</div>
				<button class="btn-all-photos">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5V11h12V3.5a.5.5 0 0 0-.5-.5h-11zm1 2h1v1h-1V5zm2 0h1v1h-1V5zm2 0h1v1h-1V5zm2 0h1v1h-1V5zm-8 2h1v1h-1V7zm2 0h1v1h-1V7zm2 0h1v1h-1V7zm2 0h1v1h-1V7zm-8 2h1v1h-1V9zm2 0h1v1h-1V9zm2 0h1v1h-1V9zm2 0h1v1h-1V9z"/></svg>
					Mostrar todas las fotos
				</button>
			</div>
		</div>

		<div class="container content-layout">
			<div class="main-content">
				<section class="overview-section">
					<div class="host-info">
						<div class="host-text">
							<h2>Diseñada para el descanso absoluto</h2>
							<p>Experiencia de lujo curada por AFE Resort & Spa</p>
						</div>
						<div class="resort-logo">AFE</div>
					</div>
					
					<div class="luxury-divider"></div>

					<div class="highlights">
						<div class="highlight-item">
							<div class="h-icon">🏊</div>
							<div class="h-text">
								<strong>Vista Privilegiada</strong>
								<p>Disfruta de amaneceres únicos desde tu terraza privada con vista al océano.</p>
							</div>
						</div>
						<div class="highlight-item">
							<div class="h-icon">🧼</div>
							<div class="h-text">
								<strong>Altos Estándares de Limpieza</strong>
								<p>Protocolos de desinfección de grado médico para tu total tranquilidad.</p>
							</div>
						</div>
						<div class="highlight-item">
							<div class="h-icon">🗓️</div>
							<div class="h-text">
								<strong>Cancelación Flexible</strong>
								<p>Cancela hasta 48 horas antes y obtén un reembolso completo del depósito.</p>
							</div>
						</div>
					</div>

					<div class="luxury-divider"></div>

					<div class="description">
						<h3>Sobre este espacio</h3>
						<p>{room.description || 'Esta majestuosa suite redefine el concepto de elegancia costera. Con acabados en mármol y maderas preciosas, cada rincón ha sido diseñado para ofrecer una estancia inolvidable. Equipada con tecnología de punta y ropa de cama de 1000 hilos, garantizamos un descanso real en el corazón del paraíso.'}</p>
					</div>

					<div class="luxury-divider"></div>

					<div class="amenities-section">
						<h3>Lo que ofrece este lugar</h3>
						<div class="amenities-grid">
							{#if room.amenities && room.amenities.length > 0}
								{#each room.amenities as am}
									<div class="amenity-item">
										<span class="am-icon">✦</span>
										{am.name}
									</div>
								{/each}
							{:else}
								<div class="amenity-item"><span class="am-icon">📡</span> WiFi de alta velocidad</div>
								<div class="amenity-item"><span class="am-icon">📺</span> Smart TV 75" 4K</div>
								<div class="amenity-item"><span class="am-icon">❄️</span> Aire acondicionado central</div>
								<div class="amenity-item"><span class="am-icon">🍸</span> Minibar gourmet</div>
								<div class="amenity-item"><span class="am-icon">👔</span> Servicio de planchado</div>
								<div class="amenity-item"><span class="am-icon">🚿</span> Ducha de lluvia tipo spa</div>
							{/if}
						</div>
						<button class="btn-all-amenities">Mostrar las {room.amenities.length || 15} amenidades</button>
					</div>
				</section>
			</div>

			<!-- Glassmorphism Booking Sidebar -->
			<div class="sidebar-wrapper">
				<div class="booking-glass-card sticky">
					<div class="card-header">
						<div class="price">
							<span class="amount">${displayPrice.toFixed(2)}</span>
							<span class="unit">noche</span>
						</div>
					</div>

					<div class="booking-fields">
						<div class="field-row">
							<div class="field-col border-right">
								<label>LLEGADA</label>
								<div class="field-val">{checkIn || 'Añadir fecha'}</div>
							</div>
							<div class="field-col">
								<label>SALIDA</label>
								<div class="field-val">{checkOut || 'Añadir fecha'}</div>
							</div>
						</div>
						<div class="field-row-full">
							<label>HUÉSPEDES</label>
							<div class="field-val">{guests} {parseInt(guests) === 1 ? 'huésped' : 'huéspedes'}</div>
						</div>
					</div>

					{#if room.is_active}
						<a href={bookingUrl} class="btn-reserve-magnetic">
							Solicitar Reserva
							<span class="glow"></span>
						</a>
						
						<p class="no-charge-hint">No se te cobrará nada todavía</p>

						{#if numNights > 0}
							<div class="price-breakdown">
								<div class="breakdown-row">
									<span class="label">Noches ({numNights})</span>
									<span class="val">${subtotal.toFixed(2)}</span>
								</div>
							
								<div class="breakdown-row">
									<span class="label">IVA (13%)</span>
									<span class="val">${iva.toFixed(2)}</span>
								</div>
								<div class="breakdown-row">
									<span class="label">Impuesto Turismo (5%)</span>
									<span class="val">${tourism.toFixed(2)}</span>
								</div>
								<div class="total-row">
									<span>Total</span>
									<span>${total.toFixed(2)}</span>
								</div>
							</div>
						{/if}
					{:else}
						<button class="btn-inactive" disabled>No disponible temporalmente</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</main>

<PublicFooter />

<style>
	.luxury-room-detail {
		background: #fff;
		color: #1a1a1a;
		padding-bottom: 10rem;
		font-family: 'Inter', sans-serif;
	}
	:global(.dark) .luxury-room-detail { background: #0a0d12; color: #f0ece4; }

	.container { max-width: 1120px; margin: 0 auto; padding: 0 2rem; }

	/* Loader */
	.loader-container { height: 100vh; display: flex; align-items: center; justify-content: center; }
	.luxury-spinner { width: 50px; height: 50px; border: 2px solid rgba(212, 175, 55, 0.2); border-top-color: #D4AF37; border-radius: 50%; animation: luxury-spin 1s ease-in-out infinite; }
	@keyframes luxury-spin { to { transform: rotate(360deg); } }

	/* Nav */
	.top-nav-details { padding-top: 2rem; margin-bottom: 1.5rem; }
	.breadcrumbs { display: flex; gap: 0.75rem; font-size: 0.85rem; color: #717171; align-items: center; }
	.breadcrumbs a { color: inherit; text-decoration: none; transition: color 0.3s; }
	.breadcrumbs a:hover { color: #000; text-decoration: underline; }
	:global(.dark) .breadcrumbs a:hover { color: #fff; }

	/* Title Section */
	.main-title-section { margin-bottom: 2rem; }
	.badge { display: inline-block; background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(170, 130, 34, 0.08)); color: #AA8222; padding: 0.4rem 1.2rem; border-radius: 2rem; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 1rem; border: 1px solid rgba(212, 175, 55, 0.2); }
	.main-title-section h1 { font-family: 'Outfit'; font-size: 2.8rem; font-weight: 500; margin: 0 0 1rem 0; line-height: 1.1; letter-spacing: -0.5px; }
	.main-title-section h1 .number { font-weight: 300; opacity: 0.4; }
	.specs-bar { display: flex; align-items: center; gap: 0.75rem; font-size: 0.95rem; color: #717171; }
	.spec-dot { color: #D4AF37; font-size: 1.2rem; }

	/* Bento Photo Grid */
	.bento-photo-grid {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr;
		grid-template-rows: repeat(2, 250px);
		gap: 6px;
		border-radius: 1.25rem;
		overflow: hidden;
		position: relative;
		margin-bottom: 3.5rem;
		box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);
	}
	.bento-photo-grid img { width: 100%; height: 100%; object-fit: cover; transition: all 0.7s cubic-bezier(0.165, 0.84, 0.44, 1); cursor: pointer; filter: brightness(0.95) saturate(1.1); }
	.bento-photo-grid img:hover { transform: scale(1.06); filter: brightness(0.85) saturate(1.2); }
	
	.grid-main { grid-row: span 2; position: relative; }
	.grid-side { overflow: hidden; position: relative; }

	.btn-all-photos {
		position: absolute; bottom: 1.25rem; right: 1.25rem;
		background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
		color: #1a1a1a; border: 1px solid rgba(0,0,0,0.15);
		padding: 0.6rem 1.2rem; border-radius: 0.6rem; font-weight: 600;
		font-size: 0.8rem; display: flex; align-items: center; gap: 0.5rem;
		cursor: pointer; transition: all 0.3s; letter-spacing: 0.3px;
	}
	.btn-all-photos:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.12); }

	/* Content Layout */
	.content-layout { display: grid; grid-template-columns: 1fr 380px; gap: 5rem; }

	.host-info { display: flex; justify-content: space-between; align-items: center; }
	.host-text h2 { font-family: 'Outfit'; font-size: 1.6rem; font-weight: 600; margin: 0 0 0.25rem 0; }
	.host-text p { margin: 0; color: #717171; font-size: 1rem; }
	.resort-logo { width: 50px; height: 50px; background: #0B0E14; color: #D4AF37; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-family: 'Outfit'; font-weight: 800; border: 2px solid #D4AF37; }

	.luxury-divider { height: 1px; background: linear-gradient(90deg, transparent, #d4af3733, #ebebeb, #d4af3733, transparent); margin: 2.5rem 0; }
	:global(.dark) .luxury-divider { background: linear-gradient(90deg, transparent, #d4af3722, #333, #d4af3722, transparent); }

	/* Highlights */
	.highlights { display: flex; flex-direction: column; gap: 2rem; }
	.highlight-item { display: flex; gap: 1.5rem; align-items: flex-start; }
	.h-icon { font-size: 1.8rem; line-height: 1; }
	.h-text strong { display: block; font-size: 1.1rem; font-weight: 600; margin-bottom: 0.25rem; }
	.h-text p { margin: 0; color: #717171; line-height: 1.5; font-size: 0.95rem; }

	/* Description */
	.description h3 { font-family: 'Outfit'; font-size: 1.4rem; font-weight: 600; margin-bottom: 1.5rem; }
	.description p { line-height: 1.8; color: #333; font-size: 1.05rem; }
	:global(.dark) .description p { color: #ccc; }

	/* Amenities */
	.amenities-section h3 { font-family: 'Outfit'; font-size: 1.4rem; font-weight: 600; margin-bottom: 1.5rem; }
	.amenities-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; }
	.amenity-item { display: flex; align-items: center; gap: 1rem; font-size: 1rem; color: #333; }
	:global(.dark) .amenity-item { color: #ccc; }
	.am-icon { color: #AA8222; width: 24px; text-align: center; }

	.btn-all-amenities {
		background: transparent; border: 1px solid #000; color: #000;
		padding: 0.8rem 1.5rem; border-radius: 0.5rem; font-weight: 600;
		font-size: 1rem; cursor: pointer; transition: all 0.2s;
	}
	:global(.dark) .btn-all-amenities { border-color: #fff; color: #fff; }
	.btn-all-amenities:hover { background: #f7f7f7; }
	:global(.dark) .btn-all-amenities:hover { background: rgba(255,255,255,0.1); }

	/* Booking Sidebar */
	.sidebar-wrapper { position: relative; }
	.sticky { position: sticky; top: 120px; }
	
	.booking-glass-card {
		background: #fff;
		border: 1px solid rgba(212, 175, 55, 0.15);
		border-radius: 1.5rem;
		padding: 1.75rem;
		box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 32px 64px rgba(0,0,0,0.04);
		transition: box-shadow 0.4s ease;
	}
	.booking-glass-card:hover { box-shadow: 0 12px 32px rgba(0,0,0,0.1), 0 40px 80px rgba(0,0,0,0.06); }
	:global(.dark) .booking-glass-card {
		background: rgba(20, 24, 32, 0.9);
		backdrop-filter: blur(24px) saturate(140%);
		border-color: rgba(212, 175, 55, 0.1);
		box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03);
	}
	:global(.dark) .booking-glass-card:hover { box-shadow: 0 24px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05); }

	.card-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; }
	.price .amount { font-size: 1.6rem; font-weight: 700; }
	.price .unit { font-size: 1rem; color: #717171; font-weight: 400; }
	.rating { font-size: 0.9rem; font-weight: 600; }
	.star { color: #AA8222; }
	.reviews { font-weight: 400; color: #717171; text-decoration: underline; margin-left: 0.25rem; }

	.booking-fields {
		border: 1px solid #b0b0b0;
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
		overflow: hidden;
	}
	:global(.dark) .booking-fields { border-color: #444; }
	.field-row { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #b0b0b0; }
	:global(.dark) .field-row { border-color: #444; }
	.field-col { padding: 0.75rem; }
	.border-right { border-right: 1px solid #b0b0b0; }
	:global(.dark) .border-right { border-color: #444; }
	.field-row-full { padding: 0.75rem; }
	
	.booking-fields label { display: block; font-size: 0.65rem; font-weight: 800; color: #000; margin-bottom: 0.25rem; }
	:global(.dark) .booking-fields label { color: #fff; }
	.field-val { font-size: 0.9rem; color: #717171; }

	.btn-reserve-magnetic {
		display: block; width: 100%; padding: 1rem; 
		background: linear-gradient(135deg, #D4AF37 0%, #B8922A 50%, #D4AF37 100%);
		background-size: 200% auto;
		color: #0B0E14; text-align: center; border-radius: 0.75rem;
		text-decoration: none; font-weight: 700; font-family: 'Outfit';
		font-size: 1.05rem; letter-spacing: 1px; text-transform: uppercase;
		transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); position: relative;
		overflow: hidden; box-shadow: 0 6px 20px rgba(212, 175, 55, 0.35);
	}
	.btn-reserve-magnetic:hover { background-position: right center; transform: translateY(-2px); box-shadow: 0 10px 30px rgba(212, 175, 55, 0.45); }

	.no-charge-hint { text-align: center; font-size: 0.85rem; color: #717171; margin: 1rem 0 1.5rem 0; }

	.price-breakdown { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem; }
	.breakdown-row { display: flex; justify-content: space-between; font-size: 1rem; color: #333; }
	:global(.dark) .breakdown-row { color: #ccc; }
	.breakdown-row .label { text-decoration: underline; color: #717171; }
	.total-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 1.1rem; border-top: 1px solid #ebebeb; padding-top: 1rem; margin-top: 0.5rem; }
	:global(.dark) .total-row { border-color: #333; }

	.btn-inactive { width: 100%; padding: 1rem; background: #f0f0f0; border: none; border-radius: 0.75rem; color: #999; font-weight: 600; cursor: not-allowed; }

	.report-listing { text-align: center; margin-top: 1.5rem; color: #717171; font-size: 0.85rem; font-weight: 600; text-decoration: underline; cursor: pointer; }

	@media (max-width: 1024px) {
		.content-layout { grid-template-columns: 1fr; gap: 3rem; }
		.sidebar-wrapper { order: -1; }
		.sticky { position: relative; top: 0; }
		.bento-photo-grid { grid-template-columns: 1fr 1fr; grid-template-rows: repeat(3, 200px); }
		.grid-main { grid-column: span 2; grid-row: span 1; }
	}

	@media (max-width: 768px) {
		.main-title-section h1 { font-size: 2rem; }
		.bento-photo-grid { display: block; border-radius: 0; margin-left: -2rem; margin-right: -2rem; }
		.grid-side { display: none; }
		.btn-all-photos { bottom: 1rem; right: 1rem; }
		.amenities-grid { grid-template-columns: 1fr; }
	}
</style>
