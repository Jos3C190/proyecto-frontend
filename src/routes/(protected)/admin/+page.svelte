<script lang="ts">
	import {goto} from '$app/navigation';
	import {onMount} from 'svelte';
	import {authStore} from '$lib/stores/auth.store';
	import {API_BASE} from '$lib/config/api';
	import './adminPage.css';

	let users = $state<Array<{ id: number; username: string; email: string; role: string }>>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		const user = $authStore.user;
		const token = $authStore.token;
		if (!user || user.role !== 'admin') {
			goto('/dashboard', { replaceState: true });
			return;
		}
		if (!token) {
			goto('/login', { replaceState: true });
			return;
		}
		try {
			const res = await fetch(`${API_BASE}/admin/users`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			if (!res.ok) {
				if (res.status === 403) {
					goto('/dashboard', { replaceState: true });
					return;
				}
				throw new Error('Error al cargar usuarios');
			}
			users = await res.json();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error de conexión';
		} finally {
			loading = false;
		}
	});
</script>

<div class="admin-page">
	<h1 class="admin-title">Panel de administración</h1>
	<p class="admin-desc">Solo visible para usuarios con rol <strong>admin</strong>.</p>

	{#if loading}
		<p class="admin-loading">Cargando...</p>
	{:else if error}
		<div class="admin-error" role="alert">{error}</div>
	{:else}
		<section class="admin-section">
			<h2 class="admin-section-title">Usuarios</h2>
			<ul class="admin-list">
				{#each users as u}
					<li class="admin-list-item">
						<span class="admin-user-name">{u.username}</span>
						<span class="admin-user-email">{u.email}</span>
						<span class="admin-user-role">{u.role}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
