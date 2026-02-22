<script lang="ts">
	import {goto} from '$app/navigation';
	import {onMount} from 'svelte';
	import {authStore} from '$lib/stores/auth.store';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';
	import './loginPage.css';

	onMount(() => {
		const unsub = authStore.subscribe((auth) => {
			if (auth.user) goto('/dashboard', { replaceState: true });
		});
		return unsub;
	});
</script>

<div class="auth-page">
	<LoginForm />
</div>
