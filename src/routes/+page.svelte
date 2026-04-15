<script lang="ts">
	import { authStore } from '$lib/stores/auth.store';
	import { getPublicRooms } from '$lib/services/room.service';
	import PublicNavbar from '$lib/components/layout/PublicNavbar.svelte';
	import type { RoomRead } from '$lib/types/room';
	import { onMount, tick } from 'svelte';
	
	let featuredRooms = $state<RoomRead[]>([]);
	let loading = $state(true);
	let scrollY = $state(0);
	
	onMount(() => {
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
		
		getPublicRooms().then((rooms) => {
			featuredRooms = rooms;
		}).catch((e) => {
			console.error(e);
		}).finally(() => {
			loading = false;
			tick().then(() => {
				setTimeout(handleScroll, 100);
			});
		});
		
		return () => window.removeEventListener('scroll', handleScroll);
	});

	let isLoggedIn = $derived(!!$authStore.user);
</script>

<svelte:head>
	<title>AFE Resort & Spa | Lujo Redefinido</title>
	<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="luxury-landing">
	<!-- Navbar Glassmorphism -->
	<PublicNavbar alwaysTransparent={true} />
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


</style>
