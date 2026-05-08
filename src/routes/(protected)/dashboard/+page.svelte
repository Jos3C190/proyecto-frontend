<script lang="ts">
	import { onMount } from 'svelte';
	import { getDashboardStats, type DashboardStats } from '$lib/services/dashboard.service';
	import { getAdminReservations } from '$lib/services/reservation.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import DashboardChart from '$lib/components/ui/DashboardChart.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission, getDisplayName } from '$lib/types';
	import '../admin/adminPage.css';

	let stats = $state<DashboardStats | null>(null);
	let recentReservations = $state<ReservationRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Checar si el usuario tiene permiso explícito sobre el recurso dashboard
	let hasDashboardAccess = $derived(hasPermission($authStore.user, 'dashboard', 'read'));

	async function loadDashboard() {
		if (!hasDashboardAccess) return;
		loading = true;
		try {
			const [statsData, reservationsData] = await Promise.all([
				getDashboardStats(),
				getAdminReservations()
			]);
			stats = statsData;
			recentReservations = reservationsData.slice(0, 6);
			error = null;
		} catch (err: any) {
			error = err.message;
			toast.error('Error al cargar dashboard: ' + err.message);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		if ($authStore.user) {
			if (!hasPermission($authStore.user, 'dashboard', 'read')) {
				goto('/profile', { replaceState: true });
				return;
			}
			loadDashboard();
		}
	});

	function formatDateShort(dateStr: string) {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
	}

	function goToReservations() {
		goto('/admin/reservaciones');
	}
</script>

<svelte:head>
	<title>Admin - Dashboard</title>
</svelte:head>

{#if hasDashboardAccess}
<div class="admin-page fade-in">
	<div class="admin-header-container">
		<div>
			<h1 class="admin-title">Panel de Control</h1>
		</div>
		<div class="flex items-center gap-2">
			<button class="action-icon-btn" onclick={loadDashboard} title="Actualizar">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
			</button>
		</div>
	</div>

	{#if loading && !stats}
		<div class="admin-loading">
			<div class="flex flex-col items-center gap-4">
				<div class="h-10 w-10 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent"></div>
				<p>Consolidando inteligencia de negocio...</p>
			</div>
		</div>
	{:else if error}
		<div class="admin-error">{error}</div>
	{:else if stats}
		<!-- KPI Row: High Level Business Intelligence -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			<DashboardCard 
				title="Ingresos Totales (30d)" 
				value="${stats.kpis.revenue.total.toLocaleString()}" 
				growth={stats.kpis.revenue.growth}
				subtitle="Rendimiento financiero actual"
			>
				{#snippet icon()}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
				{/snippet}
				{#snippet extra()}
					<div class="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
						<span>Proyectado 7d:</span>
						<span class="text-emerald-600 dark:text-emerald-400">
							${stats.revenue_trend.filter(t => t.type === 'forecast').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
						</span>
					</div>
				{/snippet}
			</DashboardCard>

			<DashboardCard 
				title="ADR (Tarifa Promedio)" 
				value="${stats.kpis.revenue.adr?.toLocaleString()}" 
				subtitle="Calidad de la venta por noche"
			>
				{#snippet icon()}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 5-5-3-5 3"/><path d="m17 19-5 3-5-3"/><path d="M2 12h20"/><path d="m5 7 3 5-3 5"/><path d="m19 7-3 5 3 5"/></svg>
				{/snippet}
				{#snippet extra()}
					<div class="flex flex-col gap-1">
						<div class="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
							<div class="h-full bg-[#D4AF37]" style="width: {stats.kpis.revenue.price_efficiency || 0}%"></div>
						</div>
						<span class="text-[9px] text-slate-400">Eficiencia de precios: {stats.kpis.revenue.price_efficiency || 0}%</span>
					</div>
				{/snippet}
			</DashboardCard>

			<DashboardCard 
				title="RevPAR (Ingreso x Hab)" 
				value="${stats.kpis.revenue.revpar?.toLocaleString()}" 
				subtitle="Rentabilidad de inventario"
			>
				{#snippet icon()}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
				{/snippet}
				{#snippet extra()}
					<div class="flex justify-between items-center">
						<span class="text-[10px] text-slate-500 uppercase font-bold">Crecimiento (30d):</span>
						<span class="text-[10px] font-bold { (stats.kpis.revenue.revpar_growth || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500' }">
							{stats.kpis.revenue.revpar_growth > 0 ? '+' : ''}{stats.kpis.revenue.revpar_growth}%
						</span>
					</div>
				{/snippet}
			</DashboardCard>

			<DashboardCard 
				title="Ocupación Actual" 
				value="{( (stats.kpis.rooms.occupied / stats.kpis.rooms.total) * 100).toFixed(1)}%" 
				subtitle="{stats.kpis.rooms.occupied} / {stats.kpis.rooms.total} hab. ocupadas"
			>
				{#snippet icon()}
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>
				{/snippet}
				{#snippet extra()}
					<div class="flex gap-2">
						<div class="flex items-center gap-1">
							<div class="h-2 w-2 rounded-full bg-emerald-500"></div>
							<span class="text-[9px] font-bold text-slate-500">{stats.kpis.rooms.available} Habitaciones Libres</span>
						</div>
					</div>
				{/snippet}
			</DashboardCard>
		</div>

		<!-- Main Intelligence Section -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
			<div class="lg:col-span-2">
				<div class="admin-section h-full">
					<div class="flex items-center justify-between mb-8">
						<div>
							<h2 class="admin-section-title !mb-1">Tendencia y Pronóstico</h2>
							<p class="text-xs text-slate-400 uppercase tracking-widest font-bold">Histórico 30d + Proyección 7d</p>
						</div>
						<div class="flex gap-2">
							<div class="flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
								<div class="h-2 w-2 rounded-full bg-[#D4AF37]"></div>
								<span class="text-[10px] font-bold text-slate-600 dark:text-slate-300">REAL</span>
							</div>
							<div class="flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
								<div class="h-2 w-2 rounded-full bg-[#D4AF37] opacity-40"></div>
								<span class="text-[10px] font-bold text-slate-400">FORECAST</span>
							</div>
						</div>
					</div>
					<div class="mt-4">
						<DashboardChart data={stats.revenue_trend} height={350} />
					</div>
				</div>
			</div>

			<div class="lg:col-span-1 space-y-6">
				<!-- Operations Card -->
				<div class="admin-section shadow-2xl">
					<h3 class="text-xs font-bold uppercase tracking-widest text-[#D4AF37] mb-4">Operaciones (Próx 7 días)</h3>
					<div class="grid grid-cols-2 gap-4">
						<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
							<span class="block text-2xl font-['Outfit'] font-light mb-1 text-slate-900 dark:text-white">{stats.kpis.rooms.arrivals_7d}</span>
							<span class="text-[10px] text-slate-400 uppercase font-bold">Llegadas</span>
						</div>
						<div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
							<span class="block text-2xl font-['Outfit'] font-light mb-1 text-slate-900 dark:text-white">{stats.kpis.rooms.departures_7d}</span>
							<span class="text-[10px] text-slate-400 uppercase font-bold">Salidas</span>
						</div>
					</div>
					<button class="w-full mt-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#D4AF37] transition-colors" onclick={goToReservations}>Ver reporte de ocupación →</button>
				</div>

				<!-- Market Mix (Revenue by Room Type) -->
				<div class="admin-section">
					<h3 class="admin-section-title !text-sm !mb-6">Distribución por Tipo de Hab. (30d)</h3>
					<div class="space-y-4">
						{#each stats.market_mix as item}
							<div class="space-y-1.5">
								<div class="flex justify-between text-[11px] font-bold">
									<span class="text-slate-600 dark:text-slate-400">{item.label}</span>
									<span class="text-slate-900 dark:text-white">${item.value.toLocaleString()}</span>
								</div>
								<div class="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
									<div class="h-full bg-gradient-to-r from-[#D4AF37] to-[#AA8222]" style="width: {(item.value / stats.kpis.revenue.total) * 100}%"></div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Bottom Intelligence -->
		<div class="grid grid-cols-1 mt-8">
			<div class="admin-section">
				<div class="flex items-center justify-between mb-8">
					<div>
						<h2 class="admin-section-title !mb-1">Últimas Transacciones</h2>
						<p class="text-xs text-slate-400">Auditoría financiera inmediata.</p>
					</div>
					<div class="flex gap-2">
						<button class="admin-btn-secondary !text-[10px] !px-4 !py-1.5">Exportar CSV</button>
						<button class="admin-btn-secondary !text-[10px] !px-4 !py-1.5" onclick={goToReservations}>Ver todo</button>
					</div>
				</div>

				<div class="admin-table-wrapper">
					<table class="admin-table">
						<thead>
							<tr>
								<th>ID Tracking</th>
								<th>Titular</th>
								<th>Activo (Hab)</th>
								<th>Periodo</th>
								<th>Impacto (Total)</th>
								<th>Estado</th>
							</tr>
						</thead>
						<tbody>
							{#each recentReservations as res}
								<tr class="cursor-pointer group" onclick={() => goto(`/admin/reservaciones/${res.id}/detalle`)}>
									<td class="font-bold text-slate-900 dark:text-white capitalize tabular-nums">{res.unique_id}</td>
									<td>
										<div class="flex flex-col">
											<span class="font-bold text-sm">
												{#if res.user?.profile}
													{res.user.profile.person_type === 'Juridica' ? (res.user.profile.business_name || res.user.profile.first_name) : `${res.user.profile.first_name} ${res.user.profile.last_name === 'N/A' ? '' : res.user.profile.last_name || ''}`}
												{:else}
													{res.user?.email || 'N/A'}
												{/if}
											</span>
											<span class="text-[9px] text-slate-400 uppercase tracking-tighter">Socio Registrado</span>
										</div>
									</td>
									<td>
										<span class="font-bold">Unit {res.room?.number}</span>
										<span class="text-[10px] text-slate-400 block">{res.room?.type}</span>
									</td>
									<td class="text-xs tabular-nums font-medium">{formatDateShort(res.check_in)} - {formatDateShort(res.check_out)}</td>
									<td class="font-bold text-[#D4AF37] tabular-nums">${res.total_cost}</td>
									<td>
										<div class="flex items-center gap-2">
											<span class="admin-badge {res.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-yellow-500/10 text-yellow-600'}">
												{res.status}
											</span>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	{/if}
</div>
{/if}

<style>
	@reference '../admin/adminPage.css';
	
	.admin-page {
		@apply p-8 max-w-7xl mx-auto;
	}

	.admin-section {
		@apply bg-white/40 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200/50 shadow-lg shadow-[#D4AF37]/5 dark:border-slate-800/50;
	}
</style>
