<script lang="ts">
	import { authStore } from '$lib/stores/auth.store';
	import PublicNavbar from '$lib/components/layout/PublicNavbar.svelte';
	let { children } = $props();
	
	let scrollY = $state(0);
	let isLoggedIn = $derived(!!$authStore.user);
</script>

<svelte:window bind:scrollY={scrollY} />

<div class="public-rooms-layout">
	<!-- Public Navigation Header -->
	<PublicNavbar alwaysTransparent={false} />

	<main class="main-content">
		{@render children()}
	</main>
</div>

<style>
	:global(html) {
		--bg-main: #f8fafc;
		--bg-alt: #ffffff;
		--text-main: #0f172a;
		--text-muted: #64748b;
		--border-light: rgba(0,0,0,0.1);
		--nav-bg: rgba(255, 255, 255, 0.95);
		--btn-outline-text: #0f172a;
	}
	:global(html.dark) {
		--bg-main: #0B0E14;
		--bg-alt: #0f131a;
		--text-main: #ffffff;
		--text-muted: #94a3b8;
		--border-light: rgba(255,255,255,0.05);
		--nav-bg: rgba(11, 14, 20, 0.95);
		--btn-outline-text: #ffffff;
	}

	.public-rooms-layout {
		min-height: 100vh;
		background: var(--bg-main);
		color: var(--text-main);
		font-family: 'Inter', sans-serif;
	}

	.standard-navbar {
		position: fixed;
		top: 0; left: 0; right: 0;
		z-index: 1000;
		background: var(--nav-bg);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid transparent;
		transition: all 0.3s ease;
		padding: 1rem 0;
	}
	.standard-navbar.scrolled {
		border-bottom: 1px solid var(--border-light);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
	}
	.nav-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 5%;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.nav-brand {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--text-main);
		text-decoration: none;
	}
	.brand-accent {
		font-weight: 800;
		color: #D4AF37;
	}
	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	.nav-link {
		color: var(--text-muted);
		text-decoration: none;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 1px;
		transition: color 0.3s;
	}
	.nav-link:hover { color: var(--text-main); }

	.btn-gold {
		background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%);
		color: #0B0E14;
		padding: 0.6rem 1.5rem;
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

	.btn-outline {
		border: 1px solid var(--border-light);
		color: var(--btn-outline-text);
		padding: 0.6rem 1.5rem;
		border-radius: 2px;
		text-decoration: none;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.85rem;
		transition: all 0.3s;
	}
	.btn-outline:hover {
		background: var(--text-main);
		color: var(--bg-main);
	}

	.main-content {
		padding-top: 5rem;
	}
</style>
