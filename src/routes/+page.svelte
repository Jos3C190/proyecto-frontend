<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';

	// redirigir a dashboard si hay sesión, si no a login
	onMount(() => {
		const unsub = authStore.subscribe((auth) => {
			if (auth.user) goto('/dashboard', { replaceState: true });
			else goto('/login', { replaceState: true });
		});
		return unsub;
	});
</script>

<div class="root-redirect">Redirigiendo...</div>

<style>
	@reference './layout.css';
	.root-redirect {
		@apply flex min-h-svh items-center justify-center text-slate-500;
	}
</style>
