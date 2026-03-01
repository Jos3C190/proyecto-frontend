<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth.store';
	import { getDisplayName, hasRole } from '$lib/types';
	import Icon from '$lib/components/icons/Icon.svelte';
	import './Sidebar.css';

	function handleLogout() {
		authStore.clearAuth();
		goto('/login', { replaceState: true });
	}

	$: navItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
		...(hasRole($authStore.user, 'admin')
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
			<span class="sidebar-user-name">{getDisplayName($authStore.user)}</span>
			<span class="sidebar-user-email">{$authStore.user?.email ?? ''}</span>
			{#if $authStore.user?.roles?.length}
				<span class="sidebar-user-role">{$authStore.user.roles.map(r => r.name).join(', ')}</span>
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
