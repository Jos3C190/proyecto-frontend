<script lang="ts">
	import {goto} from '$app/navigation';
	import {browser} from '$app/environment';
	import {onMount} from 'svelte';
	import {authStore} from '$lib/stores/auth.store';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';

	let { children } = $props();
	let canShowLayout = $state(false);

	onMount(() => {
		const unsub = authStore.subscribe((auth) => {
			if (!auth.user) {
				goto('/login', { replaceState: true });
			} else {
				canShowLayout = true;
			}
		});
		return unsub;
	});
</script>

{#if browser && canShowLayout}
	<div class="protected-layout">
		<Sidebar />
		<main class="protected-main">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="protected-loading" aria-live="polite">Cargando...</div>
{/if}

<style>
	@reference '../layout.css';
	.protected-layout {
		@apply flex min-h-svh bg-white dark:bg-slate-900;
	}
	.protected-main {
		@apply flex-1 overflow-auto p-6;
	}
	.protected-loading {
		@apply flex min-h-svh items-center justify-center text-slate-500 dark:text-slate-400;
	}
</style>
