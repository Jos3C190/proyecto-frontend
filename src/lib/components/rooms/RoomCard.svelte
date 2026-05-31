<script lang="ts">
	import { getElSalvadorDate } from '$lib/utils/date';
	import type { RoomRead } from '$lib/types/room';
	import AmenityIcon from '$lib/components/ui/AmenityIcon.svelte';
	
	interface Props {
		room: RoomRead;
		totalPrice?: number;
		checkIn?: string;
		checkOut?: string;
		guests?: number;
	}

	let { room, totalPrice, checkIn, checkOut, guests }: Props = $props();

	// Priorizar cover_image_url y luego agregar imágenes de la galería (evitando duplicados si es posible)
	const displayImages = $derived.by(() => {
		const images: { url: string }[] = [];
		
		if (room.cover_image_url) {
			images.push({ url: room.cover_image_url });
		}
		
		if (room.images && room.images.length > 0) {
			// Agregar imágenes de la galería que no sean la misma que la portada
			room.images.forEach(img => {
				if (img.url !== room.cover_image_url) {
					images.push({ url: img.url });
				}
			});
		}
		
		// Fallback si no hay nada
		if (images.length === 0) {
			images.push({ url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" });
		}
		
		return images.slice(0, 5); // Mostrar hasta 5 imágenes en el carrusel
	});

	const detailUrl = totalPrice 
		? `/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`
		: `/rooms/${room.id}`;

	let currentImageIndex = $state(0);

	function nextImage(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		if (currentImageIndex < displayImages.length - 1) {
			currentImageIndex++;
		}
	}

	function prevImage(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		if (currentImageIndex > 0) {
			currentImageIndex--;
		}
	}

	// Calculate current active price (today) if no search total is provided
	let currentPrice = $derived.by(() => {
		if (totalPrice) return Number(totalPrice);
		
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
	});
</script>

<div class="luxury-airbnb-card-wrapper">
	<a href={detailUrl} class="luxury-airbnb-card">
		<div class="image-container">
			<div class="carousel-track" style="transform: translateX(-{currentImageIndex * 100}%);">
				{#each displayImages as img}
					<img src={img.url} alt={room.type} class="room-image" />
				{/each}
			</div>
			
			<div class="image-overlay"></div>
			
			{#if displayImages.length > 1}
				<button class="nav-btn prev" onclick={prevImage} class:hidden={currentImageIndex === 0} aria-label="Anterior">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg>
				</button>
				<button class="nav-btn next" onclick={nextImage} class:hidden={currentImageIndex === displayImages.length - 1} aria-label="Siguiente">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg>
				</button>
				<div class="pagination-dots">
					{#each displayImages as _, i}
						<span class="dot" class:active={currentImageIndex === i}></span>
					{/each}
				</div>
			{/if}
		</div>
		
		<div class="card-info">
			<div class="info-row">
				<h3 class="location">Habitación {room.number}</h3>
			</div>
			
			<div class="description-container">
				<p class="room-type-label">{room.type}</p>
				<p class="room-excerpt">{room.description || 'Una estancia inolvidable te espera en nuestro resort.'}</p>
			</div>

			<div class="amenities-row">
				<div class="amenity" title="Capacidad">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
					<span>{room.capacity}</span>
				</div>
				{#if room.amenities && room.amenities.length > 0}
					{#each room.amenities.slice(0, 2) as am}
						<div class="amenity" title={am.name}>
							{#if am.icon}
								<AmenityIcon name={am.icon} size={14} strokeWidth={2.5} class="opacity-70" />
							{:else}
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
							{/if}
							<span>{am.name.length > 10 ? am.name.substring(0, 8) + '...' : am.name}</span>
						</div>
					{/each}
				{/if}
			</div>
			
			<div class="price-container">
				<span class="price-val">${Number(currentPrice).toFixed(2)}</span> 
				<span class="price-label">{totalPrice ? 'total' : '/ noche'}</span>
			</div>
		</div>
	</a>
</div>

<style>
	.luxury-airbnb-card-wrapper {
		width: 100%;
		animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(15px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.luxury-airbnb-card {
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		gap: 0.85rem;
		background: transparent;
		transition: transform 0.3s ease;
	}

	.luxury-airbnb-card:hover {
		transform: translateY(-4px);
	}

	.image-container {
		position: relative;
		aspect-ratio: 1 / 1;
		width: 100%;
		border-radius: 16px;
		overflow: hidden;
		background: #1a1f2b;
		box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
	}

	.carousel-track {
		display: flex;
		height: 100%;
		width: 100%;
		transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1);
	}

	.room-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		flex-shrink: 0;
	}

	.image-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%);
		pointer-events: none;
	}

	.badge {
		position: absolute;
		top: 14px;
		left: 14px;
		background: rgba(255, 255, 255, 0.95);
		color: #000;
		padding: 4px 10px;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 700;
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
		backdrop-filter: blur(4px);
		letter-spacing: 0.5px;
		z-index: 10;
	}

	.nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(255,255,255,0.85);
		border: none;
		border-radius: 50%;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 15;
		opacity: 0;
		transition: opacity 0.2s, background 0.2s;
	}

	.luxury-airbnb-card:hover .nav-btn:not(.hidden) {
		opacity: 1;
	}

	.nav-btn:hover { background: white; }
	.nav-btn.prev { left: 8px; }
	.nav-btn.next { right: 8px; }
	.nav-btn.hidden { opacity: 0 !important; pointer-events: none; }
	
	.nav-btn svg {
		width: 16px;
		height: 16px;
		stroke: #222;
		stroke-width: 2.5px;
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.pagination-dots {
		position: absolute;
		bottom: 12px;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		gap: 6px;
		z-index: 10;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.luxury-airbnb-card:hover .pagination-dots {
		opacity: 1;
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: rgba(255,255,255,0.5);
		transition: background 0.3s, transform 0.2s;
	}
	.dot.active { background: white; transform: scale(1.2); }

	.card-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0 4px;
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.location {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-main);
		margin: 0;
		letter-spacing: -0.3px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.rating {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.85rem;
		font-weight: 400;
		color: var(--text-main);
	}

	.rating svg {
		width: 12px;
		height: 12px;
		fill: #D4AF37;
	}

	.description-container {
		margin-top: 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.room-type-label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-main);
		margin: 0;
	}

	.room-excerpt {
		font-size: 0.85rem;
		color: var(--text-muted);
		opacity: 0.7;
		margin: 0;
		font-weight: 300;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 2.4em;
	}

	.amenities-row {
		display: flex;
		gap: 12px;
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}
	:global(.light) .amenities-row { border-top-color: rgba(0,0,0,0.05); }

	.amenity {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--text-muted);
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.amenity svg {
		width: 14px;
		height: 14px;
		stroke-width: 1.5;
	}

	.price-container {
		margin-top: 10px;
	}

	.price-val {
		font-weight: 700;
		font-size: 1.05rem;
		color: var(--text-main);
	}

	.price-label {
		font-size: 0.9rem;
		color: var(--text-muted);
		font-weight: 300;
	}
</style>
