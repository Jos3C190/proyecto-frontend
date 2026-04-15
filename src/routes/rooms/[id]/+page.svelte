<script lang="ts">
	import { page } from '$app/stores';
	import { getRoom } from '$lib/services/room.service';
	import type { RoomRead } from '$lib/types/room';
	import { onMount } from 'svelte';
	
	let roomId = parseInt($page.params.id);
	let room = $state<RoomRead | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// URL Params if navigated from Search
	let checkIn = $page.url.searchParams.get('checkIn') || '';
	let checkOut = $page.url.searchParams.get('checkOut') || '';
	let guests = $page.url.searchParams.get('guests') || '2';

	let bookingUrl = $derived(
		`/reservations/new/${roomId}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
	);

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
	<title>{room ? `Habitación ${room.type.toUpperCase()} ${room.number}` : 'Cargando...'} | AFE Resort</title>
</svelte:head>

<main class="room-details-page">
	{#if loading}
		<div class="loader-container"><div class="spinner"></div></div>
	{:else if error}
		<div class="container padding-y">
			<div class="alert-error">
                <h2>No encontrado</h2>
                <p>{error}</p>
                <a href="/rooms" class="btn-outline">Volver a Habitaciones</a>
            </div>
		</div>
	{:else if room}
		<!-- Massive Hero Image -->
		<div class="hero-image-container">
			{#if room.images && room.images.length > 0}
				<!-- En una vista real aqui puede ir un carrusel, usaremos la primera o un grid -->
				<img src={room.images[0].url} alt="Vista de la habitación" class="hero-img" />
			{:else}
				<img src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?q=80&w=2000&auto=format&fit=crop" alt="Vista de la habitación" class="hero-img" />
			{/if}
			<div class="hero-overlay"></div>
			
			<div class="hero-titles">
				<div class="badge">Suite Exclusiva</div>
				<h1>{room.type.toUpperCase()} - No. {room.number}</h1>
			</div>
		</div>
        
		<div class="container layout-grid">
			<!-- Detalle Izquierdo -->
			<div class="content-left">
				<section class="info-section">
					<h2>Acerca de esta habitación</h2>
					<p class="room-desc">{room.description || 'Una majestuosa habitación equipada con todas las comodidades de la vida moderna, ofreciendo unas vistas inigualables y un descanso garantizado en medio del lujo absoluto.'}</p>
				</section>
				
				<div class="divider"></div>
				
				<section class="info-section">
					<h3>Características Principales</h3>
					<div class="features-grid">
						<div class="feature-item">
							<span class="icon">👥</span>
							<div>
								<strong>Capacidad Máxima</strong>
								<span>{room.capacity} Huéspedes</span>
							</div>
						</div>
						<div class="feature-item">
							<span class="icon">🛏️</span>
							<div>
								<strong>Tipo de Cama</strong>
								<span>Premium King / Queen</span>
							</div>
						</div>
						<div class="feature-item">
							<span class="icon">📐</span>
							<div>
								<strong>Espacio</strong>
								<span>Amplios Interiores</span>
							</div>
						</div>
					</div>
				</section>
				
				<div class="divider"></div>
				
				<!-- Amenidades -->
				<section class="info-section">
					<h3>Amenidades Incluidas</h3>
					{#if room.amenities && room.amenities.length > 0}
						<ul class="amenities-list">
							{#each room.amenities as am}
								<li><span>✦</span> {am.name}</li>
							{/each}
						</ul>
					{:else}
						<ul class="amenities-list">
							<li><span>✦</span> WiFi de Alta Velocidad</li>
							<li><span>✦</span> Smart TV 65"</li>
							<li><span>✦</span> Minibar Premium</li>
							<li><span>✦</span> Aire Acondicionado</li>
							<li><span>✦</span> Caja Fuerte Digital</li>
							<li><span>✦</span> Servicio a la habitación 24/7</li>
						</ul>
					{/if}
				</section>
			</div>
			
			<!-- Sticky Sidebar Booking -->
			<div class="sidebar-right">
				<div class="booking-card sticky">
					<div class="price-header">
						<span class="price-val">${room.base_price}</span>
						<span class="price-label">/ noche (base)</span>
					</div>
					
					<div class="booking-summary">
						{#if checkIn && checkOut}
							<div class="summary-item">
								<span>Check-In:</span>
								<strong>{checkIn}</strong>
							</div>
							<div class="summary-item">
								<span>Check-Out:</span>
								<strong>{checkOut}</strong>
							</div>
							<div class="summary-item">
								<span>Huéspedes:</span>
								<strong>{guests}</strong>
							</div>
							<div class="alert-info">
								ℹ️ Los precios pueden variar dependiendo de la temporada exacta de tu estancia. Las tarifas definitivas se calcularán en el pago.
							</div>
						{:else}
							<p class="hint-text">Selecciona fechas para comprobar disponibilidad y pre-reservar esta increíble obra de la hospitalidad.</p>
						{/if}
					</div>
					
					<!-- CTA -->
                    {#if room.is_active}
					    <a href={bookingUrl} class="btn-book-large">Solicitar Reserva</a>
                    {:else}
                        <button disabled class="btn-disabled">No disponible temporalmente</button>
                    {/if}
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	.room-details-page {
		padding-bottom: 6rem;
	}
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 5%;
	}
	.padding-y { padding-top: 5rem; padding-bottom: 5rem; }

	/* Hero Image */
	.hero-image-container {
		position: relative;
		width: 100%;
		height: 60vh;
		min-height: 400px;
		max-height: 600px;
		overflow: hidden;
		display: flex;
		align-items: flex-end;
		padding: 4rem 5%;
	}
	.hero-img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
	}
	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(11, 14, 20, 0.9), transparent);
		z-index: 1;
	}
	.hero-titles {
		position: relative;
		z-index: 10;
		color: #fff;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}
	.badge { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 3px; color: #D4AF37; margin-bottom: 0.5rem; font-weight: 600; }
	.hero-titles h1 { font-family: 'Outfit'; font-size: 4rem; font-weight: 300; margin: 0; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }

	/* Layout Split */
	.layout-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 4rem;
		margin-top: 4rem;
	}

	.info-section { margin-bottom: 3rem; }
	.info-section h2 { font-family: 'Outfit'; font-size: 2.5rem; font-weight: 300; color: var(--text-main); margin-bottom: 1.5rem; }
	.info-section h3 { font-family: 'Outfit'; font-size: 1.8rem; font-weight: 400; color: var(--text-main); margin-bottom: 1.5rem; }
	.room-desc { color: var(--text-muted); font-size: 1.15rem; line-height: 1.8; }
	
	.divider { height: 1px; background: var(--border-light); margin: 3rem 0; }

	/* Features */
	.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; }
	.feature-item { display: flex; align-items: flex-start; gap: 1rem; }
	.feature-item .icon { font-size: 2rem; }
	.feature-item div { display: flex; flex-direction: column; gap: 0.25rem; }
	.feature-item strong { color: var(--text-main); font-size: 1.1rem; }
	.feature-item span { color: var(--text-muted); font-size: 0.95rem; }

	/* Amenities */
	.amenities-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
	.amenities-list li { display: flex; align-items: center; gap: 0.75rem; color: var(--text-muted); font-size: 1.1rem; }
	.amenities-list li span { color: #D4AF37; font-size: 0.8rem; }

	/* Sidebar Booking */
	.sidebar-right { position: relative; }
	.sticky { position: sticky; top: 100px; }
	.booking-card {
		background: var(--bg-alt);
		border: 1px solid var(--border-light);
		padding: 2.5rem 2rem;
		border-radius: 12px;
		box-shadow: var(--card-shadow, 0 20px 40px rgba(0,0,0,0.1));
	}
	.price-header { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid var(--border-light); }
	.price-val { font-family: 'Outfit'; font-size: 3rem; font-weight: 300; color: var(--text-main); }
	.price-label { color: var(--text-muted); font-size: 1rem; font-weight: 500; text-transform: uppercase; }

	.booking-summary { margin-bottom: 2rem; }
	.summary-item { display: flex; justify-content: space-between; margin-bottom: 1rem; color: var(--text-muted); font-size: 1.1rem; }
	.summary-item strong { color: var(--text-main); font-weight: 600; }
	.hint-text { color: var(--text-muted); font-size: 1rem; line-height: 1.6; text-align: center; }
	.alert-info { background: rgba(212, 175, 55, 0.1); border-left: 3px solid #D4AF37; padding: 1rem; font-size: 0.9rem; color: var(--text-main); margin-top: 1.5rem; border-radius: 0 4px 4px 0; }

	.btn-book-large {
		display: block;
		width: 100%;
		text-align: center;
		background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%);
		color: #0B0E14;
		padding: 1.25rem;
		border-radius: 8px;
		font-family: 'Outfit';
		font-weight: 700;
		font-size: 1.25rem;
		text-transform: uppercase;
		letter-spacing: 2px;
		text-decoration: none;
		transition: all 0.3s;
		border: none;
		cursor: pointer;
	}
	.btn-book-large:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(212, 175, 55, 0.3); }

    .btn-disabled {
        display: block; width: 100%; padding: 1.25rem; text-align: center; font-size: 1.1rem; border-radius: 8px; font-weight: 600; text-transform: uppercase;
        background: var(--btn-glass-bg); color: var(--text-muted); border: 1px solid var(--border-light); cursor: not-allowed;
    }

	/* Utils */
	.loader-container { display: flex; justify-content: center; padding: 10rem 0; }
	.spinner { width: 40px; height: 40px; border: 3px solid rgba(212, 175, 55, 0.3); border-top-color: #D4AF37; border-radius: 50%; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	
	.alert-error { text-align: center; padding: 5rem 0; background: var(--bg-alt); border-radius: 12px; border: 1px solid var(--border-light); }
	.btn-outline { display: inline-block; padding: 0.75rem 2rem; border: 1px solid var(--text-main); color: var(--text-main); text-decoration: none; border-radius: 4px; font-weight: 600; margin-top: 1rem; }

	@media (max-width: 1024px) {
		.layout-grid { grid-template-columns: 1fr; }
		.hero-titles h1 { font-size: 3rem; }
	}
</style>
