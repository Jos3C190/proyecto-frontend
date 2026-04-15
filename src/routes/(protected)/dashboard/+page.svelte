<script lang="ts">
	import {authStore} from '$lib/stores/auth.store';
	import { getDisplayName, hasPermission } from '$lib/types';
	import { getDashboardStats } from '$lib/services/dashboard.service';
	import type { DashboardStats } from '$lib/services/dashboard.service';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	// import './dashboardPage.css';

	let stats = $state<DashboardStats | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Checar si el usuario tiene permiso explícito sobre el recurso dashboard
	let hasDashboardAccess = $derived(hasPermission($authStore.user, 'dashboard', 'read'));

	onMount(() => {
		const unsub = authStore.subscribe(async (auth) => {
			if (auth.user) {
				if (!hasPermission(auth.user, 'dashboard', 'read')) {
					goto('/profile', { replaceState: true });
					return;
				}
				
				// Cargar stats si tiene permiso
				if (!stats && !loading) {
					loading = true;
					try {
						stats = await getDashboardStats();
					} catch (err: any) {
						error = err.message;
					} finally {
						loading = false;
					}
				}
			}
		});
		return unsub;
	});

</script>

{#if hasDashboardAccess}
<div class="luxury-dashboard fade-in">
	<div class="dashboard-header">
		<div>
			<h1 class="dashboard-title">Panel de Administración</h1>
			<p class="dashboard-welcome">
				Bienvenido, <strong>{getDisplayName($authStore.user)}</strong>. 
			</p>
		</div>
	</div>
	
		<!-- Resumen de Operaciones (Oculto temporalmente) -->
		{#if false}
		<div class="section-title-wrapper">
			<h2 class="section-title">Resumen de Operaciones</h2>
			<div class="title-line"></div>
		</div>

		{#if loading}
			<div class="loader-container"><div class="spinner-large"></div></div>
		{:else if error}
			<div class="alert alert-error">
				<span class="icon">⚠️</span> {error}
			</div>
		{:else if stats}
			<div class="stats-grid">
				<div class="stat-card glass-card">
					<div class="stat-icon">👥</div>
					<div class="stat-info">
						<h3>Usuarios Activos</h3>
						<div class="stat-value">{stats.total_users}</div>
					</div>
				</div>
				<div class="stat-card glass-card">
					<div class="stat-icon">🏨</div>
					<div class="stat-info">
						<h3>Habitaciones Activas</h3>
						<div class="stat-value">{stats.total_rooms}</div>
					</div>
				</div>
				<div class="stat-card glass-card">
					<div class="stat-icon">📅</div>
					<div class="stat-info">
						<h3>Reservas Activas</h3>
						<div class="stat-value">{stats.active_reservations}</div>
					</div>
				</div>
				<div class="stat-card glass-card highlight-card">
					<div class="stat-icon text-gold">💰</div>
					<div class="stat-info">
						<h3 class="text-gold">Ingresos Totales</h3>
						<div class="stat-value cash">${stats.total_revenue}</div>
					</div>
				</div>
			</div>
			
		{/if}
		{/if}
</div>
{/if}

<style>
	.fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.luxury-dashboard {
		padding: 2rem 3rem;
		max-width: 1400px;
		margin: 0 auto;
		font-family: 'Inter', sans-serif;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 3rem;
	}
	.dashboard-title {
		font-family: 'Outfit', sans-serif;
		font-size: 2.5rem;
		font-weight: 300;
		color: var(--text-main);
		margin: 0 0 0.5rem 0;
	}
	.dashboard-welcome {
		margin: 0;
		color: var(--text-muted);
		font-size: 1.1rem;
	}
	.pulse-dot {
		width: 8px;
		height: 8px;
		background: #10b981;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}
	@keyframes pulse {
		0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
		70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
		100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
	}

	.section-title-wrapper {
		margin-bottom: 2rem;
	}
	.section-title {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		color: var(--text-main);
		font-weight: 400;
		margin: 0 0 0.5rem 0;
	}
	.title-line {
		height: 2px;
		width: 60px;
		background: #D4AF37;
		border-radius: 2px;
	}

	.glass-card {
		background: var(--bg-alt);
		border: 1px solid var(--border-light);
		border-radius: 12px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.05);
		transition: transform 0.3s, box-shadow 0.3s;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}
	.stat-card {
		padding: 2rem;
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	.stat-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 20px 40px rgba(0,0,0,0.1);
		border-color: rgba(212, 175, 55, 0.3);
	}
	.stat-icon {
		font-size: 2.5rem;
		opacity: 0.9;
		background: rgba(0,0,0,0.03);
		width: 70px;
		height: 70px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 16px;
	}
	.highlight-card {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.15) 100%);
		border-color: rgba(212, 175, 55, 0.3);
	}
	.stat-info h3 {
		margin: 0 0 0.5rem 0;
		color: var(--text-muted);
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	.stat-value {
		font-family: 'Outfit', sans-serif;
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-main);
		line-height: 1;
	}
	.stat-value.cash { color: #D4AF37; }
	.text-gold { color: #D4AF37 !important; }


	.loader-container { display: flex; justify-content: center; padding: 4rem; }
	.spinner-large { width: 50px; height: 50px; border: 3px solid rgba(212, 175, 55, 0.3); border-top-color: #D4AF37; border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	@media (max-width: 768px) {
		.dashboard-header { flex-direction: column; align-items: flex-start; gap: 1rem; margin-bottom: 2rem; }
		.stats-grid { grid-template-columns: 1fr; }
		.luxury-dashboard { padding: 1.5rem; }
	}
</style>
