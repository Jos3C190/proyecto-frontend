<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';

	onMount(() => {
		const u = $authStore.user;
		if (hasPermission(u, 'users', 'read')) goto('/admin/usuarios', { replaceState: true });
		else if (hasPermission(u, 'roles', 'read')) goto('/admin/roles', { replaceState: true });
		else if (hasPermission(u, 'permissions', 'read')) goto('/admin/permisos', { replaceState: true });
		else if (hasPermission(u, 'audit_logs', 'read')) goto('/admin/bitacora', { replaceState: true });
		else goto('/dashboard', { replaceState: true });
	});
</script>

<p>Redirigiendo...</p>
