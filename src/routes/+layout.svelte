<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { effectiveTheme } from '$lib/stores/theme.store';
	import ThemeToggle from '$lib/components/layout/ThemeToggle.svelte';

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
	<div class="theme-toggle-wrapper">
		<ThemeToggle />
	</div>
	{@render children()}
</div>

<style>
	@reference './layout.css';
	.layout-root {
		@apply relative min-h-svh bg-white dark:bg-slate-900;
	}
	.theme-toggle-wrapper {
		@apply fixed right-4 top-4 z-50;
	}
</style>
