<script lang="ts">
	import PublicNavbar from '$lib/components/layout/PublicNavbar.svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	let { children } = $props();
	let canShowLayout = $state(false);

	onMount(() => {
		const unsub = authStore.subscribe((auth) => {
			if (!auth.user) {
				const currentPath = window.location.pathname;
				goto(`/login?redirect=${encodeURIComponent(currentPath)}`, { replaceState: true });
			} else {
				canShowLayout = true;
			}
		});
		return unsub;
	});
</script>

{#if browser && canShowLayout}
	<div class="user-layout">
		<PublicNavbar alwaysTransparent={false} />
		
		<main class="user-main">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="user-loading" aria-live="polite"><div class="spinner"></div></div>
{/if}

<style>
	:global(html) {
		--bg-main: #f8fafc;
		--bg-alt: #ffffff;
		--text-main: #0f172a;
		--text-muted: #64748b;
		--border-light: rgba(0,0,0,0.1);
		--nav-bg: rgba(255, 255, 255, 0.95);
		--btn-glass-bg: rgba(0,0,0,0.05);
	}
	:global(html.dark) {
		--bg-main: #0B0E14;
		--bg-alt: #0f131a;
		--text-main: #ffffff;
		--text-muted: #94a3b8;
		--border-light: rgba(255,255,255,0.05);
		--nav-bg: rgba(11, 14, 20, 0.95);
		--btn-glass-bg: rgba(255,255,255,0.1);
	}

	.user-layout {
		min-height: 100vh;
		background: var(--bg-main);
		color: var(--text-main);
		font-family: 'Inter', sans-serif;
	}

	.user-main {
		padding-top: 6rem; /* Deja espacio al header */
		min-height: calc(100vh - 6rem);
	}

	.user-loading {
		display: flex; min-height: 100vh; align-items: center; justify-content: center; background: var(--bg-main);
	}
	.spinner { width: 40px; height: 40px; border: 3px solid rgba(212, 175, 55, 0.3); border-top-color: #D4AF37; border-radius: 50%; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
