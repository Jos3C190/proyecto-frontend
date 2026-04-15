<script lang="ts">
	import {goto} from '$app/navigation';
	import {onMount} from 'svelte';
	import {authStore} from '$lib/stores/auth.store';
	import {hasPermission} from '$lib/types';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import './loginPage.css';

	onMount(() => {
		const unsub = authStore.subscribe((auth) => {
			if (auth.user) {
				const params = new URLSearchParams(window.location.search);
				let red = params.get('redirect');
				if (!red) {
					// Enviar a panel admin o a su perfil según permisos
					red = hasPermission(auth.user, 'dashboard', 'read') ? '/dashboard' : '/profile';
				}
				goto(red, { replaceState: true });
			}
		});
		return unsub;
	});
</script>

<div class="auth-page">
	<LoginForm />
</div>
