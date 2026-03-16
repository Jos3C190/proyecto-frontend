<script lang="ts">
	/**
	 * El registro público fue deshabilitado.
	 * Solo el administrador puede crear usuarios desde el panel de administración.
	 */
	import {goto} from '$app/navigation';
	import {onMount} from 'svelte';
	import {authStore} from '$lib/stores/auth.store';

	onMount(() => {
		const unsub = authStore.subscribe((auth) => {
			if (auth.user) goto('/dashboard', { replaceState: true });
			else goto('/login', { replaceState: true });
		});
		return unsub;
	});
</script>

<div class="auth-page">Redirigiendo al inicio de sesión...</div>

<style>
	@reference './registerPage.css';
</style>
