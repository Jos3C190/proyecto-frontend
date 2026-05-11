<script lang="ts">
	import { page } from '$app/stores';
	import { getRoom } from '$lib/services/room.service';
	import type { RoomRead } from '$lib/types/room';
	import PublicFooter from '$lib/components/layout/PublicFooter.svelte';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let roomId = parseInt($page.params.id);
	let room = $state<RoomRead | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let allImages = $derived.by(() => {
		if (!room) return [];
		let images: string[] = [];
		if (room.cover_image_url) images.push(room.cover_image_url);
		if (room.images) {
			room.images.forEach(img => {
				if (img.url !== room.cover_image_url) images.push(img.url);
			});
		}
		return images;
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

	function handleBack() {
		window.history.back();
	}
</script>

<svelte:head>
	<title>Fotos - {room ? room.type : 'Habitación'} | AFE Resort</title>
</svelte:head>

<div class="photos-page-wrapper">
	<main class="gallery-container">
		<!-- Integrated Sub-Header -->
		<div class="gallery-sub-header">
			<div class="top-row">
				<button onclick={handleBack} class="btn-back-minimal">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
					Volver a la habitación
				</button>
				<div class="action-group">
					<button class="btn-text-action">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
						Compartir
					</button>
					<button class="btn-text-action">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
						Guardar
					</button>
				</div>
			</div>
			
			{#if room}
				<div class="title-area" in:fade>
					<h1>Galería de Imágenes</h1>
					<p>{room.type} Suite No. {room.number}</p>
				</div>
			{/if}
		</div>

		{#if loading}
			<div class="loading-state">
				<div class="spinner"></div>
			</div>
		{:else if error}
			<div class="error-state">
				<p>Error: {error}</p>
				<button onclick={handleBack} class="btn-retry">Regresar</button>
			</div>
		{:else}
			<div class="photos-grid">
				{#each allImages as img, i}
					<div 
						class="photo-item {i % 3 === 0 ? 'large' : ''}"
						in:fly={{ y: 20, duration: 600, delay: i * 50 }}
					>
						<img src={img} alt="Vista {i + 1}" loading="lazy" />
					</div>
				{/each}
			</div>

			<div class="gallery-footer-info">
				<p>© AFE Resort - Todas las imágenes son ilustrativas del espacio real.</p>
			</div>
		{/if}
	</main>
</div>

<PublicFooter />

<style>
	.photos-page-wrapper {
		min-height: 100vh;
		background: #fff;
		color: #1a1a1a;
		font-family: 'Inter', sans-serif;
	}
	:global(.dark) .photos-page-wrapper { background: #0B0E14; color: #fff; }

	.gallery-container {
		max-width: 1120px;
		margin: 0 auto;
		padding: 2rem 1.5rem 6rem;
	}

	.gallery-sub-header { margin-bottom: 3rem; }
	
	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.btn-back-minimal {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: transparent;
		border: none;
		color: inherit;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		padding: 0.6rem 0.8rem;
		border-radius: 0.5rem;
		margin-left: -0.8rem;
		transition: background 0.2s;
	}
	.btn-back-minimal:hover { background: rgba(0,0,0,0.05); }
	:global(.dark) .btn-back-minimal:hover { background: rgba(255,255,255,0.1); }

	.action-group { display: flex; gap: 0.5rem; }
	.btn-text-action {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.8rem;
		border-radius: 0.5rem;
		border: none;
		background: transparent;
		color: inherit;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
	}
	.btn-text-action:hover { background: rgba(0,0,0,0.05); }
	:global(.dark) .btn-text-action:hover { background: rgba(255,255,255,0.1); }

	.title-area h1 {
		font-family: 'Outfit';
		font-size: 2.5rem;
		font-weight: 500;
		margin: 0;
		line-height: 1;
	}
	.title-area p {
		margin: 0.5rem 0 0;
		color: #717171;
		font-size: 1.1rem;
	}

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 16px;
	}

	.photo-item {
		border-radius: 1rem;
		overflow: hidden;
		background: #f1f1f1;
		aspect-ratio: 4/3;
	}
	:global(.dark) .photo-item { background: #1a1f2b; }

	.photo-item.large {
		grid-column: span 2;
		aspect-ratio: 16/9;
	}

	.photo-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s ease;
	}
	.photo-item:hover img { transform: scale(1.03); }

	.loading-state { height: 30vh; display: flex; align-items: center; justify-content: center; }
	.spinner { width: 30px; height: 30px; border: 2px solid rgba(212, 175, 55, 0.2); border-top-color: #D4AF37; border-radius: 50%; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.gallery-footer-info {
		margin-top: 5rem;
		text-align: center;
		color: #717171;
		font-size: 0.85rem;
		border-top: 1px solid rgba(0,0,0,0.05);
		padding-top: 2rem;
	}
	:global(.dark) .gallery-footer-info { border-top-color: rgba(255,255,255,0.05); }

	@media (max-width: 768px) {
		.title-area h1 { font-size: 1.8rem; }
		.photos-grid { grid-template-columns: 1fr; gap: 10px; }
		.photo-item.large { grid-column: auto; aspect-ratio: 4/3; }
		.gallery-container { padding: 1rem 1rem 4rem; }
		.btn-text-action span { display: none; }
	}
</style>
