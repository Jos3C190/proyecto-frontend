<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { effectiveTheme } from '$lib/stores/theme.store';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';

	let { children } = $props();

	// Sincronizar clase .dark en <html> cuando cambie effectiveTheme
	onMount(() => {
		const unsub = effectiveTheme.subscribe((theme) => {
			if (!browser || !document.documentElement) return;
			if (theme === 'dark') document.documentElement.classList.add('dark');
			else document.documentElement.classList.remove('dark');
		});
		return unsub;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="layout-root">
	{@render children()}
	<ToastContainer />
</div>

<style>
	@reference './layout.css';
	.layout-root {
		@apply relative min-h-svh bg-slate-50 dark:bg-[#0B0E14];
	}
</style>
