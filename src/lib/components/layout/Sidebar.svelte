<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth.store';
	import Icon from '$lib/components/icons/Icon.svelte';
	import './Sidebar.css';

	function handleLogout() {
		authStore.clearAuth();
		goto('/login', { replaceState: true });
	}

	$: navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
		...(($authStore.user?.role === 'admin')
			? [{ href: '/admin', label: 'Admin', icon: 'admin' }]
			: [])
	];
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<a href="/dashboard" class="sidebar-brand">App AFE</a>
	</div>
	<nav class="sidebar-nav" aria-label="Principal">
		{#each navItems as item}
			<a
				href={item.href}
				class="sidebar-link"
				class:active={$page.url.pathname === item.href}
			>
				<span class="sidebar-icon" aria-hidden="true">
					<Icon name={item.icon} />
				</span>
				{item.label}
			</a>
		{/each}
	</nav>
	<div class="sidebar-footer">
		<div class="sidebar-user">
			<span class="sidebar-user-name">{$authStore.user?.name ?? $authStore.user?.username ?? 'Usuario'}</span>
			<span class="sidebar-user-email">{$authStore.user?.email ?? ''}</span>
			{#if $authStore.user?.role}
				<span class="sidebar-user-role">{$authStore.user.role}</span>
			{/if}
		</div>
		<button
			type="button"
			class="sidebar-logout"
			onclick={handleLogout}
			title="Cerrar sesión"
		>
			<Icon name="logout" iconClass="sidebar-logout-icon" />
			Salir
		</button>
	</div>
</aside>
