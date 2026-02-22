<script lang="ts">
	import { themeStore, effectiveTheme} from '$lib/stores/theme.store';
	import { browser } from '$app/environment';
	import './ThemeToggle.css';
</script>

{#if browser}
	{@const effective = $effectiveTheme === 'dark'}
	<button
		type="button"
		class="theme-toggle"
		onclick={() => themeStore.cycle()}
		title={$themeStore === 'system'
			? 'Tema: según sistema (clic para cambiar)'
			: $themeStore === 'dark'
				? 'Modo oscuro (clic para cambiar)'
				: 'Modo claro (clic para cambiar)'}
		aria-label={effective ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
	>
		{#if $themeStore === 'system'}
			<span class="theme-icon theme-icon-system" aria-hidden="true">◐</span>
		{:else if effective}
			<span class="theme-icon theme-icon-moon" aria-hidden="true">🌙</span>
		{:else}
			<span class="theme-icon theme-icon-sun" aria-hidden="true">☀️</span>
		{/if}
	</button>
{/if}

