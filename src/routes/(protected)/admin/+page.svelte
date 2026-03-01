<script lang="ts">
	import {goto} from '$app/navigation';
	import {onMount} from 'svelte';
	import {authStore} from '$lib/stores/auth.store';
	import {API_BASE} from '$lib/config/api';
	import {hasRole} from '$lib/types';
	import type { User } from '$lib/types';
	import './adminPage.css';

	let users = $state<User[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	function displayName(u: User): string {
		const p = u.profile;
		if (p?.first_name?.trim() || p?.last_name?.trim()) {
			return [p.first_name?.trim(), p.last_name?.trim()].filter(Boolean).join(' ').trim();
		}
		return u.email ?? '—';
	}

	function rolesLabel(u: User): string {
		if (!u.roles?.length) return '—';
		return u.roles.map((r) => r.name).join(', ');
	}

	onMount(async () => {
		const user = $authStore.user;
		const token = $authStore.token;
		if (!hasRole(user, 'admin')) {
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
						<span class="admin-user-name">{displayName(u)}</span>
						<span class="admin-user-email">{u.email}</span>
						<span class="admin-user-role">{rolesLabel(u)}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
