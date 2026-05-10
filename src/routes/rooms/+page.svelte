<script lang="ts">
	import { getPublicRooms, searchRooms, getPublicRoomTypes } from '$lib/services/room.service';
	import type { RoomRead, RoomSearchResponse } from '$lib/types/room';
	import RoomCard from '$lib/components/rooms/RoomCard.svelte';
	import PublicFooter from '$lib/components/layout/PublicFooter.svelte';
	import { onMount, onDestroy } from 'svelte';
	
	import { createPersistence } from '$lib/utils/persistence';
	
	const persistence = createPersistence({
		key: 'public_rooms',
		defaultValues: {
			checkIn: '',
			checkOut: '',
			guests: 2,
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
	const carouselImages = [
		'https://images.unsplash.com/photo-1611043704267-e67464e2351c?auto=format&fit=crop&w=1920&q=80',
		'https://plus.unsplash.com/premium_photo-1682913629540-3857602b540c?auto=format&fit=crop&w=1920&q=80',
		'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1920&q=80',
		'https://images.unsplash.com/photo-1578458329607-534298aebc4d?auto=format&fit=crop&w=1920&q=80'
	];
	let currentImageIndex = $state(0);
	let carouselInterval: any;

	function nextImage() {
		currentImageIndex = (currentImageIndex + 1) % carouselImages.length;
	}

	onMount(async () => {
		carouselInterval = setInterval(nextImage, 6000);
		
		// Cargar tipos dinámicos
		try {
			dynamicRoomTypes = await getPublicRoomTypes();
		} catch (err) {
			console.error('No se pudieron cargar los tipos de habitación:', err);
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

	const categories = [
		{ id: 'all', label: 'Explorar', icon: 'M3 9.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v7h2v-9a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v9h2v-12a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v12h2a.5.5 0 0 1 .5.5v.5h-18v-.5a.5.5 0 0 1 .5-.5h2v-7z' },
		{ id: 'populares', label: 'Populares', icon: 'M17.5 19c-2 0-4-2-4-5.2 0-3 3.5-5 3.5-9-3.5 1-6.5 4.5-6.5 8.5 0 2.5 1.5 5 4 5 1 0 1.5-1.5 1.5-1.5s.5.5 1.5.5c2.5 0 4-2.5 4-5.2 0-3-3.5-5-3.5-9-3.5 1-6.5 4.5-6.5 8.5 0 2.5 1.5 5 4 5z' },
		{ id: 'lujo', label: 'Lujo Absoluto', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
		{ id: 'playa', label: 'Frente al Mar', icon: 'M22 20H2v-2h1c1.5 0 2.5-1 4-2s2.5-1 4 0 2.5 2 4 2 2.5-1 4-2 2.5-1 4 0 2.5 2 4 2h1v2zM6 14c-1.5 0-3-1-3-3 0-2.5 2-4.5 5-5s5 2.5 5 5c0 2-1.5 3-3 3h-4z' },
		{ id: 'vistas', label: 'Vistas Increíbles', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
		{ id: 'familiar', label: 'Para Familias', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 16s-1 0-1-1 1-4 8-4 8 3 8 4-1 1-1 1H5z' },
		{ id: 'parejas', label: 'Romántico', icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z' },
		{ id: 'terraza', label: 'Con Terraza', icon: 'M4 21V9M20 21V9M4 9h16M4 14h16M4 21h16M7 9v12M17 9v12' },
		{ id: 'mascotas', label: 'Mascotas', icon: 'M19.1 9c.5 0 .9-.4.9-.9 0-.5-.4-.9-.9-.9s-.9.4-.9.9c0 .5.4.9.9.9zM15 6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zM9 6c.6 0 1-.4 1-1s-.4-1-1-1-1 .4-1 1 .4 1 1 1zM4.9 9c.5 0 .9-.4.9-.9 0-.5-.4-.9-.9-.9s-.9.4-.9.9c0 .5.4.9.9.9zM12 10.5c-3.3 0-6 2.7-6 6v1h12v-1c0-3.3-2.7-6-6-6zm0 5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' },
		{ id: 'piscina', label: 'Piscina', icon: 'M22 20H2v-2h20v2zm-2-5c-2.21 0-4-1.79-4-4 0-1.66 1.01-3.08 2.5-3.71.3-.13.5-.47.5-.8 0-.46-.37-.83-.83-.83H20c-1.3 0-2.36 1.06-2.36 2.36 0 .8.65 1.45 1.45 1.45.69 0 1.25.56 1.25 1.25 0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5c0-.69.56-1.25 1.25-1.25.8 0 1.45-.65 1.45-1.45C16.05 6.46 14.99 5.4 13.69 5.4c-.46 0-.83.37-.83.83 0 .33.2.67.5.8 1.49.63 2.5 2.05 2.5 3.71 0 2.21-1.79 4-4 4s-4-1.79-4-4c0-1.66 1.01-3.08 2.5-3.71.3-.13.5-.47.5-.8 0-.46-.37-.83-.83-.83h-1.38c-1.3 0-2.36 1.06-2.36 2.36 0 .8.65 1.45 1.45 1.45.69 0 1.25.56 1.25 1.25 0 1.93-1.57 3.5-3.5 3.5S4.34 10.43 4.34 8.5c0-.69.56-1.25 1.25-1.25.8 0 1.45-.65 1.45-1.45C7.04 4.49 5.98 3.43 4.68 3.43c-.46 0-.83.37-.83.83 0 .33.2.67.5.8 1.49.63 2.5 2.05 2.5 3.71 0 2.21-1.79 4-4 4s-4-1.79-4-4' },
		{ id: 'accesible', label: 'Accesible', icon: 'M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z' }
	];

	let filteredRooms = $derived.by(() => {
		let list = searchResults ? searchResults.map(r => r.room) : rooms;
		
		// Aplicar filtro del dropdown (solo si no estamos viendo resultados de búsqueda ya filtrados)
		if (!searchResults && roomType) {
			list = list.filter(r => r.type === roomType);
		}

		if (selectedCategory === 'all') return list;
		
		return list.filter(r => {
			const searchString = (r.type + ' ' + (r.description || '')).toLowerCase();
			switch (selectedCategory) {
				case 'populares': return true; // Simulate trending by just showing all or capacity > 2
				case 'lujo': return searchString.includes('suite') || searchString.includes('lux') || searchString.includes('lujo');
				case 'playa': return searchString.includes('mar') || searchString.includes('playa') || searchString.includes('beach');
				case 'vistas': return searchString.includes('vista') || searchString.includes('mar') || searchString.includes('panorámica');
				case 'familiar': return r.capacity >= 4;
				case 'parejas': return r.capacity === 2;
				case 'terraza': return searchString.includes('terraza') || searchString.includes('balcón');
				case 'mascotas': return searchString.includes('mascota') || searchString.includes('pet');
				case 'piscina': return searchString.includes('piscina') || searchString.includes('pool') || searchString.includes('alberca');
				case 'accesible': return searchString.includes('accesible') || searchString.includes('silla') || searchString.includes('discapacidad');
				default: return true;
			}
		});
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
		<div class="categories-scroll">
			{#each categories as cat}
				<button 
					class="cat-item" 
					class:active={selectedCategory === cat.id}
					onclick={() => selectedCategory = cat.id}
				>
					<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d={cat.icon} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
		gap: 2rem;
		overflow-x: auto;
		scrollbar-width: none;
		align-items: center;
		justify-content: center;
		padding-bottom: 0;
	}
	.categories-scroll::-webkit-scrollbar { display: none; }

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
		min-width: 50px;
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
