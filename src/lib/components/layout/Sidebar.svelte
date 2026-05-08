<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/auth.store';
	import { getDisplayName, hasPermission } from '$lib/types';
	import Icon from '$lib/components/icons/Icon.svelte';
	import { crossfade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import './Sidebar.css';

	const [send, receive] = crossfade({
		duration: 350,
		easing: quintOut
	});

	function handleLogout() {
		authStore.clearAuth();
		goto('/login', { replaceState: true });
	}

	$: hotelItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' as const, resource: 'dashboard' as const },
		{ href: '/admin/habitaciones', label: 'Habitaciones', icon: 'home' as const, resource: 'rooms' as const },
		{ href: '/admin/clientes', label: 'Clientes', icon: 'customers' as const, resource: 'customers' as const },
		{ href: '/admin/reservaciones', label: 'Reservaciones', icon: 'clipboard' as const, resource: 'reservations' as const },
		{ href: '/admin/pagos', label: 'Pagos', icon: 'payments' as const, resource: 'payments' as const },
		{ href: '/admin/amenidades', label: 'Amenidades', icon: 'amenities' as const, resource: 'amenities' as const },
		{ href: '/admin/reportes', label: 'Reportes', icon: 'reports' as const, resource: 'reports' as const }
	].filter((item) => hasPermission($authStore.user, item.resource, 'read'));

	$: systemItems = [
		{ href: '/admin/usuarios', label: 'Usuarios', icon: 'users' as const, resource: 'users' as const },
		{ href: '/admin/roles', label: 'Roles', icon: 'roles' as const, resource: 'roles' as const },
		{ href: '/admin/permisos', label: 'Permisos', icon: 'permissions' as const, resource: 'permissions' as const },
		{ href: '/admin/bitacora', label: 'Bitácora', icon: 'audit' as const, resource: 'audit_logs' as const },
		{ href: '/admin/configuracion', label: 'Configuración', icon: 'settings' as const, resource: 'settings' as const }
	].filter((item) => hasPermission($authStore.user, item.resource, 'read'));
</script>

<aside class="sidebar">
	<nav class="sidebar-nav pt-6 relative" aria-label="Principal">
		{#if hotelItems.length > 0}
			<div class="sidebar-group-label">Gestión Hotelera</div>
			{#each hotelItems as item}
				<a
					href={item.href}
					class="sidebar-link"
					class:active={$page.url.pathname === item.href}
				>
					{#if $page.url.pathname === item.href}
						<div 
							class="sidebar-link-bg"
							in:receive={{ key: 'active-pill' }}
							out:send={{ key: 'active-pill' }}
						></div>
					{/if}
					<span class="sidebar-icon relative" aria-hidden="true">
						<Icon name={item.icon} />
					</span>
					<span class="relative z-10">{item.label}</span>
				</a>
			{/each}
		{/if}

		{#if systemItems.length > 0}
			<div class="sidebar-group-label">Administración Sistema</div>
			{#each systemItems as item}
				<a
					href={item.href}
					class="sidebar-link"
					class:active={$page.url.pathname === item.href}
				>
					{#if $page.url.pathname === item.href}
						<div 
							class="sidebar-link-bg"
							in:receive={{ key: 'active-pill' }}
							out:send={{ key: 'active-pill' }}
						></div>
					{/if}
					<span class="sidebar-icon relative" aria-hidden="true">
						<Icon name={item.icon} />
					</span>
					<span class="relative z-10">{item.label}</span>
				</a>
			{/each}
		{/if}
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
