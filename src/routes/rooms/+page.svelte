<script lang="ts">
	import { getPublicRooms, searchRooms, getPublicRoomTypes, getPublicAmenities, type AmenityRead } from '$lib/services/room.service';
	import type { RoomRead, RoomSearchResponse } from '$lib/types/room';
	import RoomCard from '$lib/components/rooms/RoomCard.svelte';
	import PublicFooter from '$lib/components/layout/PublicFooter.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { fetchPublicSettings } from '$lib/services/settings.service';
	import AmenityIcon from '$lib/components/ui/AmenityIcon.svelte';
	
	import { createPersistence } from '$lib/utils/persistence';
	
	const persistence = createPersistence({
		key: 'public_rooms',
		defaultValues: {
			checkIn: '',
			checkOut: '',
			guests: 1,
			roomType: '',
			selectedCategory: 'all'
		}
	});

	const initialState = persistence.getInitialState();

	let rooms = $state<RoomRead[]>([]);
	let searchResults = $state<RoomSearchResponse[] | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let dynamicRoomTypes = $state<string[]>([]);
	let allAmenities = $state<AmenityRead[]>([]);
	let featuredFilterIds = $state<number[]>([]);
	
	let selectedCategory = $state(initialState.selectedCategory);

	// Search parms
	let checkIn = $state(initialState.checkIn);
	let checkOut = $state(initialState.checkOut);
	let guests = $state(initialState.guests);
	let roomType = $state(initialState.roomType);

	// Sync state to persistence
	$effect(() => {
		persistence.saveState({
			checkIn,
			checkOut,
			guests,
			roomType,
			selectedCategory
		});
	});

	const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/El_Salvador' });
	let minCheckOut = $derived(checkIn ? (() => {
		const d = new Date(checkIn);
		d.setDate(d.getDate() + 1);
		return d.toISOString().split('T')[0];
	})() : today);

	$effect(() => {
		if (checkIn && checkOut && checkOut <= checkIn) {
			checkOut = minCheckOut;
		}
	});

	// Carousel Logic
	let carouselImages = $state<string[]>([
		'https://images.unsplash.com/photo-1611043704267-e67464e2351c?auto=format&fit=crop&w=1920&q=80',
		'https://plus.unsplash.com/premium_photo-1682913629540-3857602b540c?auto=format&fit=crop&w=1920&q=80',
		'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1920&q=80',
		'https://images.unsplash.com/photo-1578458329607-534298aebc4d?auto=format&fit=crop&w=1920&q=80'
	]);
	let currentImageIndex = $state(0);
	let carouselInterval: any;

	function nextImage() {
		if (carouselImages.length === 0) return;
		currentImageIndex = (currentImageIndex + 1) % carouselImages.length;
	}

	onMount(async () => {
		carouselInterval = setInterval(nextImage, 6000);
		
		// Cargar tipos dinámicos y filtros configurados
		try {
			const [typesRes, settingsRes, amenitiesRes] = await Promise.all([
				getPublicRoomTypes(),
				fetchPublicSettings(),
				getPublicAmenities()
			]);
			dynamicRoomTypes = typesRes;
			allAmenities = amenitiesRes;
			
			const filtersVal = settingsRes.featured_amenity_filters || '';
			featuredFilterIds = filtersVal ? filtersVal.split(',').map(Number).filter(Boolean) : [];
			
			if (settingsRes.hero_images_rooms) {
				const urls = settingsRes.hero_images_rooms.split(',').map(s => s.trim()).filter(Boolean);
				if (urls.length > 0) {
					carouselImages = urls;
				}
			}
		} catch (err) {
			console.error('Error al cargar tipos, configuraciones públicas o amenidades:', err);
		}

		if (checkIn && checkOut) {
			await performSearch();
		} else {
			await loadPublicRooms();
		}
	});

	onDestroy(() => {
		if (carouselInterval) clearInterval(carouselInterval);
	});

	async function loadPublicRooms() {
		loading = true;
		try {
			rooms = await getPublicRooms();
			searchResults = null; // Limpiar resultados anteriores si los hubo
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function performSearch(e?: Event) {
		if (e) e.preventDefault();
		if (!checkIn || !checkOut) return;
		
		loading = true;
		error = null;
		try {
			// roomType opcional
			searchResults = await searchRooms(checkIn, checkOut, guests, roomType || undefined);
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
	
	function clearSearch() {
		checkIn = '';
		checkOut = '';
		roomType = '';
		loadPublicRooms();
	}

	let categories = $derived.by(() => {
		const list = [
			{ id: 'all', label: 'Explorar', icon: 'M3 9.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v7h2v-9a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v9h2v-12a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v12h2a.5.5 0 0 1 .5.5v.5h-18v-.5a.5.5 0 0 1 .5-.5h2v-7z' }
		];
		
		featuredFilterIds.forEach(id => {
			const amenity = allAmenities.find(a => a.id === id);
			if (amenity) {
				list.push({
					id: `amenity_${id}`,
					label: amenity.name,
					icon: amenity.icon || ''
				});
			}
		});
		
		return list;
	});

	let filteredRooms = $derived.by(() => {
		let list = searchResults ? searchResults.map(r => r.room) : rooms;
		
		// Aplicar filtro del dropdown (solo si no estamos viendo resultados de búsqueda ya filtrados)
		if (!searchResults && roomType) {
			list = list.filter(r => r.type === roomType);
		}

		if (selectedCategory === 'all') return list;
		
		if (selectedCategory.startsWith('amenity_')) {
			const amenityId = parseInt(selectedCategory.replace('amenity_', ''));
			return list.filter(r => r.amenities.some(a => a.id === amenityId));
		}
		
		return list;
	});
</script>

<svelte:head>
	<title>Catálogo de Habitaciones | AFE Resort</title>
</svelte:head>




<!-- Premium Page Header with Carousel -->
<header class="page-header">
	<div class="carousel-container">
		{#each carouselImages as img, i}
			<div 
				class="carousel-slide" 
				class:active={currentImageIndex === i}
				style="background-image: url('{img}')"
			></div>
		{/each}
	</div>
	<div class="overlay"></div>
	<div class="header-content">
		<h1>Nuestras Habitaciones</h1>
		<p>Selecciona tu próximo destino de descanso</p>
	</div>
</header>

<!-- Search Console -->
<div class="search-console-container">
	<div class="search-console">
		<form onsubmit={performSearch} class="search-form">
			<div class="input-block">
				<label>Check-In</label>
				<input type="date" bind:value={checkIn} min={today} required />
			</div>
			<div class="divider"></div>
			<div class="input-block">
				<label>Check-Out</label>
				<input type="date" bind:value={checkOut} min={minCheckOut} required />
			</div>
			<div class="divider"></div>
			<div class="input-block">
				<label>Huéspedes</label>
				<input type="number" bind:value={guests} min="1" required />
			</div>
			<div class="divider"></div>
			<div class="input-block">
				<label>Tipo (Opcional)</label>
				<select bind:value={roomType}>
					<option value="">Cualquiera</option>
					{#each dynamicRoomTypes as type}
						<option value={type}>{type}</option>
					{/each}
				</select>
			</div>
			<div class="actions">
				<button type="submit" class="btn-primary" aria-label="Buscar"></button>
				{#if searchResults}
					<button type="button" class="btn-clear" onclick={clearSearch}>
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
					</button>
				{/if}
			</div>
		</form>
	</div>
</div>

<!-- Category Filter Airbnb Style -->
<div class="category-filter-bar">
	<div class="container">
		<div 
			class="categories-scroll"
			onwheel={(e) => {
				if (e.deltaY !== 0) {
					e.preventDefault();
					e.currentTarget.scrollLeft += e.deltaY;
				}
			}}
		>
			{#each categories as cat}
				<button 
					class="cat-item" 
					class:active={selectedCategory === cat.id}
					onclick={() => selectedCategory = cat.id}
				>
					{#if cat.id === 'all'}
						<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d={cat.icon} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
					{:else}
						<AmenityIcon name={cat.icon} size={20} class="transition-transform duration-200" />
					{/if}
					<span>{cat.label}</span>
				</button>
			{/each}
		</div>
	</div>
</div>

<main class="rooms-main">
	<div class="container">
		{#if error}
			<div class="error-alert">{error}</div>
		{/if}
		
		{#if loading}
			<div class="loader-container"><div class="spinner"></div></div>
		{:else if searchResults !== null}
			<!-- Mostrando resultados de búsqueda -->
			<div class="results-header">
				<div class="luxury-eyebrow">Disponibilidad Garantizada</div>
				<h3>Resultados para tu estancia</h3>
				<div class="search-summary">
					<span class="summary-item">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
						{checkIn} — {checkOut}
					</span>
					<span class="summary-separator">|</span>
					<span class="summary-item">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
						{guests} {guests === 1 ? 'Persona' : 'Personas'}
					</span>
				</div>
			</div>
			
			{#if searchResults.length === 0}
				<div class="empty-state">
					<span class="icon">😔</span>
					<h2>Sin disponibilidad</h2>
					<p>Lo sentimos, no hay habitaciones que cumplan todos los requisitos en esas fechas.</p>
				</div>
			{:else}
				<div class="rooms-grid">
					{#each searchResults as r}
						<RoomCard 
							room={r.room} 
							totalPrice={r.total_price} 
							{checkIn} 
							{checkOut} 
							{guests} 
						/>
					{/each}
				</div>
			{/if}
			
		{:else}
			<!-- Catálogo General -->
			<div class="results-header">
				<div class="luxury-eyebrow">Catálogo Exclusivo</div>
				<h3>Explora nuestras Suites</h3>
				<p>Cada habitación ha sido diseñada para ofrecer una experiencia sensorial única y un descanso sin precedentes.</p>
			</div>
			
			{#if filteredRooms.length === 0}
				<p class="empty-state">No hay habitaciones publicadas todavía o que coincidan con la categoría.</p>
			{:else}
				<div class="rooms-grid">
					{#if searchResults !== null}
						{#each searchResults as r}
							{#if selectedCategory === 'all' || r.room.type.toLowerCase().includes(selectedCategory)}
								<RoomCard 
									room={r.room} 
									totalPrice={r.total_price} 
									{checkIn} 
									{checkOut} 
									{guests} 
								/>
							{/if}
						{/each}
					{:else}
						{#each filteredRooms as room}
							<RoomCard {room} />
						{/each}
					{/if}
				</div>
			{/if}
		{/if}
	</div>
</main>

<PublicFooter />


<style>
	.page-header {
		position: relative;
		height: 45vh;
		min-height: 450px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		margin-top: -5rem;
		padding-top: 5rem;
		overflow: hidden;
	}
	.carousel-container {
		position: absolute;
		inset: 0;
		z-index: 0;
	}
	.carousel-slide {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		opacity: 0;
		transform: scale(1.05);
		transition: opacity 2.5s ease-in-out, transform 2.5s ease-in-out;
	}
	.carousel-slide.active {
		opacity: 1;
		transform: scale(1.15);
		transition: opacity 2.5s ease-in-out, transform 10s ease-out;
	}
	.overlay {
		position: absolute; 
		inset: 0; 
		background: linear-gradient(to bottom, rgba(11, 14, 20, 0.75), rgba(11, 14, 20, 0.5));
		z-index: 1;
	}
	.header-content {
		position: relative; z-index: 10; text-align: center;
	}
	.header-content h1 {
		font-family: 'Outfit', sans-serif;
		font-size: 3.5rem;
		font-weight: 300;
		margin: 0 0 0.5rem;
		letter-spacing: -1px;
	}
	.header-content p {
		font-size: 1.25rem;
		color: #cbd5e1;
	}

	.search-console-container {
		max-width: 1000px;
		margin: -40px auto 4rem;
		position: relative;
		z-index: 20;
		padding: 0 2rem;
	}
	.search-console {
		background: #ffffff;
		padding: 0.5rem 1rem 0.5rem 2rem;
		border-radius: 100px;
		box-shadow: 0 15px 35px rgba(0,0,0,0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	:global(.dark) .search-console {
		background: #1a1f2b;
	}
	.search-form { 
		display: flex; 
		align-items: center; 
		justify-content: space-between; 
		gap: 0; 
	}
	.input-block { 
		flex: 1; 
		display: flex; 
		flex-direction: column; 
		padding: 0.5rem 1.5rem;
		transition: background 0.3s;
		border-radius: 40px;
		cursor: pointer;
	}
	.input-block:hover {
		background: rgba(0,0,0,0.03);
	}
	:global(.dark) .input-block:hover {
		background: rgba(255,255,255,0.03);
	}
	.input-block label { 
		font-size: 0.65rem; 
		font-weight: 800; 
		text-transform: uppercase; 
		letter-spacing: 0.5px; 
		color: var(--text-muted); 
		margin-bottom: 2px; 
	}
	.input-block input, .input-block select { 
		background: transparent; 
		border: none; 
		color: var(--text-main); 
		font-size: 0.9rem; 
		padding: 0; 
		outline: none; 
		font-family: inherit; 
		font-weight: 600;
	}
	
	.input-block select option { background: var(--bg-main); color: var(--text-main); }
	.divider { width: 1px; height: 30px; background: rgba(0,0,0,0.1); align-self: center; }
	:global(.dark) .divider { background: rgba(255,255,255,0.1); }
	
	.actions { display: flex; gap: 0.5rem; align-items: center; padding-left: 1rem; }
	.btn-primary { 
		background: #D4AF37; 
		color: #fff; 
		width: 48px;
		height: 48px;
		border: none; 
		border-radius: 50%; 
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer; 
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
		box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
	}
	.btn-primary::before {
		content: '';
		width: 18px;
		height: 18px;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E");
		background-size: contain;
		background-repeat: no-repeat;
	}
	.btn-primary:hover { 
		transform: scale(1.05); 
		background: #c5a02e;
		box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
	}
	
	.container { max-width: 1400px; margin: 0 auto; padding: 0 5% 5rem; }
	
	.results-header { margin: 3rem 0 3rem; text-align: center; }
	.luxury-eyebrow { font-family: 'Outfit'; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 4px; color: #D4AF37; margin-bottom: 0.5rem; }
	.results-header h3 { font-size: 2.5rem; font-family: 'Outfit'; margin: 0 0 0.75rem; color: var(--text-main); font-weight: 300; letter-spacing: -1px; }
	.results-header p { color: var(--text-muted); font-size: 1rem; max-width: 600px; margin: 0 auto; line-height: 1.5; opacity: 0.8; }
	
	.search-summary { display: inline-flex; align-items: center; gap: 1.5rem; background: rgba(255, 255, 255, 0.05); padding: 0.75rem 2rem; border-radius: 100px; border: 1px solid var(--border-light); margin-top: 1rem; }
	.summary-item { display: flex; align-items: center; gap: 0.75rem; color: var(--text-main); font-weight: 600; font-size: 0.9rem; }
	.summary-item svg { color: #D4AF37; }
	.summary-separator { color: var(--border-light); font-weight: 300; }

	.rooms-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 2.5rem 1.5rem;
		margin-top: 1rem;
	}
	
	@media (min-width: 1200px) {
		.rooms-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	
	/* Estilos de Categoría  */
	.category-filter-bar {
		padding: 0;
		margin-top: -1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}
	.category-filter-bar .container {
		padding-bottom: 0.7rem;
	}
	:global(.light) .category-filter-bar { border-bottom-color: rgba(0,0,0,0.05); }

	.categories-scroll {
		display: flex;
		gap: 2.25rem;
		overflow-x: auto;
		align-items: center;
		padding-bottom: 12px; /* space for scrollbar */
		width: 100%;
		justify-content: flex-start;
		scrollbar-width: thin;
		scrollbar-color: rgba(212, 175, 55, 0.25) transparent;
	}
	.categories-scroll::-webkit-scrollbar {
		height: 4px;
		display: block;
	}
	.categories-scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.categories-scroll::-webkit-scrollbar-thumb {
		background-color: rgba(212, 175, 55, 0.15);
		border-radius: 20px;
		transition: background-color 0.2s ease;
	}
	.categories-scroll:hover::-webkit-scrollbar-thumb {
		background-color: rgba(212, 175, 55, 0.45);
	}

	.cat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		padding-bottom: 8px;
		color: var(--text-muted);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
		min-width: 60px;
		flex-shrink: 0;
	}
	.cat-item svg { width: 20px; height: 20px; opacity: 0.7; transition: transform 0.2s; }
	.cat-item span { font-size: 0.75rem; font-weight: 500; letter-spacing: 0.2px; }

	.cat-item:hover { color: var(--text-main); border-bottom-color: rgba(212, 175, 55, 0.3); }
	.cat-item:hover svg { opacity: 1; transform: translateY(-2px); }

	.cat-item.active { color: #D4AF37; border-bottom-color: #D4AF37; }
	.cat-item.active svg { opacity: 1; }
	
	/* Estilos antiguos eliminados por el uso del componente */

	.empty-state { text-align: center; padding: 5rem 0; color: var(--text-muted); }
	.empty-state .icon { font-size: 4rem; display: block; margin-bottom: 1rem; }
	.loader-container { display: flex; justify-content: center; padding: 5rem; }
	.spinner { width: 40px; height: 40px; border: 3px solid rgba(212, 175, 55, 0.3); border-top-color: #D4AF37; border-radius: 50%; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	
	@media (max-width: 1024px) {
		.search-console { border-radius: 24px; padding: 1.5rem; }
		.search-form { flex-direction: column; align-items: stretch; gap: 1rem; }
		.input-block { width: 100%; padding: 0.5rem 0; border-bottom: 1px solid var(--border-light); border-radius: 0; }
		.input-block:hover { background: transparent; }
		.divider { display: none; }
		.actions { padding-left: 0; justify-content: center; }
		.btn-primary { width: 100%; border-radius: 12px; height: 50px; }
		.btn-primary::before { margin-right: 8px; }
		.btn-primary::after { content: 'Ver Disponibilidad'; font-weight: 700; font-family: 'Outfit'; }
	}
</style>
