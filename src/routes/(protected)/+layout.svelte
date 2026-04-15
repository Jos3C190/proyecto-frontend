<script lang="ts">
	import {goto, onNavigate} from '$app/navigation';
	import {browser} from '$app/environment';
	import {onMount} from 'svelte';
	import {authStore} from '$lib/stores/auth.store';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import PublicNavbar from '$lib/components/layout/PublicNavbar.svelte';

	let { children } = $props();
	let canShowLayout = $state(false);

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});

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
	<div class="admin-wrapper">
		<PublicNavbar alwaysTransparent={false} />
		<div class="protected-layout">
			<Sidebar />
			<main class="protected-main">
				{@render children()}
			</main>
		</div>
	</div>
{:else}
	<div class="protected-loading" aria-live="polite">Cargando...</div>
{/if}

<style>
	@reference '../layout.css';
	.admin-wrapper {
		@apply fixed inset-0 flex flex-col bg-slate-50 dark:bg-[#0B0E14];
	}
	
	.protected-layout {
		@apply flex flex-1 w-full overflow-hidden;
		margin-top: 4.5rem;
		height: calc(100svh - 4.5rem);
	}
	
	.protected-main {
		@apply flex-1 overflow-y-auto p-4 md:p-8 h-full;
	}
	
	.protected-loading {
		@apply flex min-h-svh items-center justify-center text-[#D4AF37] font-['Outfit'] tracking-widest text-xl bg-[#0B0E14];
	}
</style>
