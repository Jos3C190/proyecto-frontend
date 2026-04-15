<script lang="ts">
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ThemeToggle from '$lib/components/layout/ThemeToggle.svelte';
	
	let { alwaysTransparent = false } = $props<{ alwaysTransparent?: boolean }>();

	let scrollY = $state(0);
	let dropdownOpen = $state(false);

	let isLoggedIn = $derived(!!$authStore.user);
	// Corregido: utilizando Casbin a través de la interfaz hasPermission
	let isAdmin = $derived(hasPermission($authStore.user, 'dashboard', 'read'));

	function toggleDropdown() {
		dropdownOpen = !dropdownOpen;
	}

	function handleLogout() {
		authStore.clearAuth();
		dropdownOpen = false;
		goto('/login');
	}

	// Clic afuera para cerrar
	function clickOutside(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
				dropdownOpen = false;
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	let currentPath = $derived($page.url.pathname);
</script>

<svelte:window bind:scrollY={scrollY} />

<nav class="public-navbar {scrollY > 50 || !alwaysTransparent ? 'scrolled' : ''} {alwaysTransparent && scrollY <= 50 ? 'absolute-pos' : 'fixed-pos'}">
	<div class="nav-container">
		<a href="/" class="nav-brand">
			<span class="brand-accent">AFE</span> Resort
		</a>
		<div class="nav-links">
			{#if isLoggedIn}
				<a href="/rooms" class="nav-link" class:active={currentPath.startsWith('/rooms')}>Habitaciones</a>
				<a href="/profile/reservations" class="nav-link" class:active={currentPath.startsWith('/profile/reservations')}>Mis Reservas</a>
				
				<div class="dropdown-wrapper" use:clickOutside>
					<button class="btn-profile" onclick={toggleDropdown} aria-expanded={dropdownOpen}>
						<span class="avatar-icon">👤</span>
						<span class="username">{$authStore.user?.profile?.first_name || 'Perfil'}</span>
						<span class="chevron">▼</span>
					</button>

					{#if dropdownOpen}
						<div class="dropdown-menu">
							<div class="dropdown-header">
								<strong>{$authStore.user?.profile?.first_name} {$authStore.user?.profile?.last_name}</strong>
								<small>{$authStore.user?.email}</small>
							</div>
							<div class="dropdown-divider"></div>
							<a href="/profile" class="dropdown-item" onclick={() => dropdownOpen = false}>👤 Mi Perfil</a>
							{#if isAdmin}
								<a href="/dashboard" class="dropdown-item text-gold" onclick={() => dropdownOpen = false}>⚙️ Panel de Administración</a>
							{/if}
							<div class="dropdown-divider"></div>
							<button class="dropdown-item text-danger" onclick={handleLogout}>🚪 Cerrar Sesión</button>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/login" class="nav-link">Acceder</a>
				<a href="/rooms" class="btn-gold">Reservar Ahora</a>
			{/if}
			<div class="border-l border-slate-300/30 pl-4 ml-2 dark:border-slate-700/50">
				<ThemeToggle />
			</div>
		</div>
	</div>
</nav>

<style>
	.public-navbar {
		z-index: 1000;
		transition: all 0.4s ease;
		border-bottom: 1px solid transparent;
		font-family: 'Inter', sans-serif;
	}
	.fixed-pos { position: fixed; top: 0; left: 0; right: 0; }
	.absolute-pos { position: absolute; top: 0; left: 0; right: 0; }

	.public-navbar.scrolled {
		background: var(--nav-bg, rgba(11, 14, 20, 0.95));
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.05));
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
	}

	.nav-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1.25rem 5%;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.public-navbar.scrolled .nav-container {
		padding: 1rem 5%;
	}

	.nav-brand {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		font-weight: 300;
		letter-spacing: 2px;
		text-transform: uppercase;
		color: var(--text-main, #fff);
		text-decoration: none;
	}
	.brand-accent {
		font-weight: 800;
		color: #D4AF37;
	}
	
	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	
	.nav-link {
		color: var(--text-muted, #94a3b8);
		text-decoration: none;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 1px;
		transition: color 0.3s;
	}
	.nav-link:hover, .nav-link.active { color: var(--text-main, #fff); }

	.btn-gold {
		background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%);
		color: #0B0E14;
		padding: 0.6rem 1.5rem;
		border-radius: 2px;
		text-transform: uppercase;
		font-weight: 700;
		font-size: 0.85rem;
		letter-spacing: 1px;
		text-decoration: none;
		transition: transform 0.3s, box-shadow 0.3s;
	}
	.btn-gold:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(212, 175, 55, 0.3);
	}

	.dropdown-wrapper { position: relative; }
	.btn-profile {
		display: flex; align-items: center; gap: 0.5rem;
		background: transparent; border: none; color: var(--text-main, #fff);
		cursor: pointer; font-family: inherit; font-weight: 600; font-size: 0.95rem;
		padding: 0.5rem; border-radius: 4px; transition: background 0.3s;
	}
	.btn-profile:hover { background: var(--btn-glass-bg, rgba(255,255,255,0.1)); }
	.avatar-icon { font-size: 1.2rem; }
	.chevron { font-size: 0.7rem; color: var(--text-muted); transition: transform 0.3s; }
	.btn-profile[aria-expanded="true"] .chevron { transform: rotate(180deg); }

	.dropdown-menu {
		position: absolute; top: 100%; right: 0; margin-top: 0.5rem;
		background: var(--bg-alt, #0f131a);
		border: 1px solid var(--border-light, rgba(255,255,255,0.05));
		border-radius: 8px;
		box-shadow: 0 20px 40px rgba(0,0,0,0.5);
		min-width: 250px;
		overflow: hidden;
		animation: fadeIn 0.2s ease;
	}
	.dropdown-header { padding: 1rem; display: flex; flex-direction: column; }
	.dropdown-header strong { color: var(--text-main, #fff); font-size: 1rem; }
	.dropdown-header small { color: var(--text-muted); font-size: 0.85rem; }
	
	.dropdown-divider { height: 1px; background: var(--border-light); }
	
	.dropdown-item {
		display: block; width: 100%; text-align: left;
		padding: 1rem; background: transparent; border: none;
		color: var(--text-muted); text-decoration: none; font-size: 0.95rem;
		cursor: pointer; transition: background 0.2s, color 0.2s; font-family: inherit;
	}
	.dropdown-item:hover { background: var(--btn-glass-bg); color: var(--text-main); }
	.text-gold { color: #D4AF37; font-weight: 600; }
	.text-gold:hover { color: #efcd5c; }
	.text-danger { color: #ef4444; }
	.text-danger:hover { color: #f87171; }

	@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

	@media (max-width: 768px) {
		.nav-container { flex-direction: column; gap: 1rem; }
		.dropdown-menu { right: auto; left: 50%; transform: translateX(-50%); }
	}
</style>
