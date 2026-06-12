<script lang="ts">
	import { onMount } from 'svelte';
	import { getDashboardStats, type DashboardStats } from '$lib/services/dashboard.service';
	import { getRecentReservations } from '$lib/services/reservation.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import DashboardChart from '$lib/components/ui/DashboardChart.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission, getDisplayName } from '$lib/types';
	import { HelpCircle } from 'lucide-svelte';
	import '../admin/adminPage.css';

	let stats = $state<DashboardStats | null>(null);
	let recentReservations = $state<ReservationRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Modo de proyección del gráfico: 'accrual' (Devengado) o 'cash' (Caja/Tesorería)
	let forecastMode = $state<'accrual' | 'cash'>('accrual');

	// Filtro dinámico de la tendencia adaptado al modo seleccionado
	let trendData = $derived(
		stats ? stats.revenue_trend.map(item => ({
			...item,
			amount: forecastMode === 'accrual' ? item.amount : (item.amount_cash ?? item.amount)
		})) : []
	);

	// Checar si el usuario tiene permiso explícito sobre el recurso dashboard
	let hasDashboardAccess = $derived(hasPermission($authStore.user, 'dashboard', 'read'));

	async function loadDashboard() {
		if (!hasDashboardAccess) return;
		loading = true;
		try {
			const [statsData, reservationsData] = await Promise.all([
				getDashboardStats(),
				getRecentReservations(6)
			]);
			stats = statsData;
			recentReservations = reservationsData;
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
							<div class="flex items-center gap-2 group/title relative">
								<h2 class="admin-section-title !mb-0">Tendencia y Pronóstico</h2>
								<div class="relative group/tooltip">
									<button type="button" class="text-slate-400 hover:text-[#D4AF37] transition-colors focus:outline-none flex items-center justify-center p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/50">
										<HelpCircle class="w-4 h-4 cursor-help" />
									</button>
									
									<!-- Tooltip Container (Opens Downwards to avoid Navbar collision) -->
									<div class="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 p-4 bg-[#11151d] dark:bg-[#11151d] text-white rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-all duration-300 transform scale-95 origin-top group-hover/tooltip:scale-100 z-50 leading-relaxed text-xs">
										<!-- Triangle arrow pointing up -->
										<div class="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-[#11151d]"></div>
										
										<div class="font-bold text-[#D4AF37] text-[13px] mb-2 flex items-center gap-1.5 font-['Outfit']">
											Inteligencia Financiera Híbrida
										</div>
										
										<div class="space-y-2 text-slate-300 text-left">
											<p>
												<strong class="text-white">¿Para qué sirve?</strong><br>
												Visualiza la salud financiera del hotel comparando ingresos históricos reales con dos tipos de proyecciones futuras (seleccionables con el switch).
											</p>
											<p>
												<strong class="text-white">Histórico (REAL):</strong><br>
												Suma de todos los pagos reales completados de los últimos 30 días (alojamiento + extras + incidentales).
											</p>
											<p>
												<strong class="text-white">Proyección (FORECAST) - Modos:</strong>
											</p>
											<ul class="list-disc pl-4 space-y-1.5">
												<li>
													<strong class="text-[#D4AF37]">Devengado (Hab):</strong> Suma el costo total de alojamiento de las futuras reservas. Mide el volumen y ocupación de negocio realizable.
												</li>
												<li>
													<strong class="text-[#D4AF37]">Caja (Por Cobrar):</strong> Proyecta los saldos netos pendientes por cobrar en la recepción, excluyendo los prepagos ya recaudados.
												</li>
											</ul>
										</div>
									</div>
								</div>
							</div>
							<p class="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">Histórico 30d + Proyección 7d</p>
						</div>
						<div class="flex flex-wrap items-center gap-3">
							<!-- Selector de Modo de Proyección (Switch de Lujo) -->
							<div class="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
								<button 
									type="button"
									onclick={() => forecastMode = 'accrual'}
									class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all {forecastMode === 'accrual' ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA8222] text-slate-900 shadow-sm' : 'text-slate-550 hover:text-slate-700 dark:hover:text-slate-350 text-slate-500'}"
								>
									Devengado (Hab)
								</button>
								<button 
									type="button"
									onclick={() => forecastMode = 'cash'}
									class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all {forecastMode === 'cash' ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA8222] text-slate-900 shadow-sm' : 'text-slate-550 hover:text-slate-700 dark:hover:text-slate-350 text-slate-500'}"
								>
									Caja (Por Cobrar)
								</button>
							</div>

							<!-- Leyendas -->
							<div class="flex gap-2">
								<div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50/50 border border-slate-100 dark:border-slate-800">
									<div class="h-2 w-2 rounded-full bg-[#D4AF37]"></div>
									<span class="text-[10px] font-bold text-slate-600 dark:text-slate-300">REAL</span>
								</div>
								<div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50/50 border border-slate-100 dark:border-slate-800">
									<div class="h-2 w-2 rounded-full bg-[#D4AF37] opacity-40"></div>
									<span class="text-[10px] font-bold text-slate-400">FORECAST</span>
								</div>
							</div>
						</div>
					</div>
					<div class="mt-4">
						<DashboardChart data={trendData} height={350} />
					</div>
				</div>
			</div>

			<div class="lg:col-span-1">
				<div class="admin-section h-full flex flex-col justify-between shadow-2xl min-h-[480px]">
					<div>
						<!-- Header -->
						<div class="mb-6">
							<h3 class="text-xs font-black uppercase tracking-widest text-[#D4AF37] mb-1">Centro de Control</h3>
							<p class="text-[10px] text-slate-400 uppercase tracking-tighter font-bold">Operaciones en tiempo real</p>
						</div>

						<!-- Real-time Occupancy Gauge -->
						<div class="p-4 rounded-2xl bg-gradient-to-br from-slate-50/50 to-slate-100/30 dark:from-slate-800/40 dark:to-slate-900/40 border border-slate-200/40 dark:border-slate-800/60 mb-6">
							<div class="flex justify-between items-center mb-3">
								<span class="text-[10px] uppercase font-black text-slate-500 tracking-wider">Ocupación del Resort</span>
								<span class="text-xs font-black text-[#D4AF37] tabular-nums">
									{(stats.kpis.rooms.total > 0 ? ((stats.kpis.rooms.occupied / stats.kpis.rooms.total) * 100) : 0).toFixed(1)}%
								</span>
							</div>
							
							<!-- Glowing Progress Bar -->
							<div class="h-2 w-full bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden relative">
								<div class="h-full bg-gradient-to-r from-[#D4AF37] to-[#AA8222] shadow-[0_0_8px_#D4AF37/50] rounded-full transition-all duration-1000" style="width: {stats.kpis.rooms.total > 0 ? ((stats.kpis.rooms.occupied / stats.kpis.rooms.total) * 100) : 0}%"></div>
							</div>

							<!-- Sub-KPIs Grid -->
							<div class="grid grid-cols-3 gap-2 mt-4 text-center">
								<div class="flex flex-col">
									<span class="text-xs font-bold text-slate-950 dark:text-white tabular-nums">{stats.kpis.rooms.occupied}</span>
									<span class="text-[8px] text-slate-400 uppercase font-black tracking-tight">Ocupadas</span>
								</div>
								<div class="flex flex-col border-x border-slate-200/60 dark:border-slate-800/60">
									<span class="text-xs font-bold text-slate-950 dark:text-white tabular-nums">{stats.kpis.rooms.available}</span>
									<span class="text-[8px] text-slate-400 uppercase font-black tracking-tight">Libres</span>
								</div>
								<div class="flex flex-col">
									<span class="text-xs font-bold text-slate-950 dark:text-white tabular-nums">{stats.kpis.rooms.total}</span>
									<span class="text-[8px] text-slate-400 uppercase font-black tracking-tight">Total</span>
								</div>
							</div>
						</div>

						<!-- Next Movements (7 days) -->
						<div class="space-y-3 mb-6">
							<span class="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Movimientos (Próximos 7 días)</span>
							<div class="grid grid-cols-2 gap-3">
								<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
									<div class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
									</div>
									<div>
										<span class="block text-lg font-['Outfit'] font-bold leading-none tabular-nums text-slate-950 dark:text-white">{stats.kpis.rooms.arrivals_7d}</span>
										<span class="text-[8px] text-slate-400 uppercase font-black tracking-wider">Llegadas</span>
									</div>
								</div>
								
								<div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 flex items-center gap-3">
									<div class="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
									</div>
									<div>
										<span class="block text-lg font-['Outfit'] font-bold leading-none tabular-nums text-slate-950 dark:text-white">{stats.kpis.rooms.departures_7d}</span>
										<span class="text-[8px] text-slate-400 uppercase font-black tracking-wider">Salidas</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Quick Actions Menu -->
						<div class="space-y-2">
							<span class="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Acciones Rápidas</span>
							<div class="grid grid-cols-1 gap-2">
								<a href="/admin/reservaciones/nueva" class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-[#D4AF37] dark:hover:border-[#D4AF37] transition-all group/action">
									<div class="flex items-center gap-2">
										<svg class="w-3.5 h-3.5 text-[#D4AF37]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
										<span class="text-[10px] font-bold text-slate-700 dark:text-slate-350 group-hover/action:text-[#D4AF37] transition-colors">Nueva Reservación</span>
									</div>
									<svg class="w-3 h-3 text-slate-400 group-hover/action:translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
								</a>

								<a href="/admin/reservaciones" class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 hover:border-[#D4AF37] dark:hover:border-[#D4AF37] transition-all group/action">
									<div class="flex items-center gap-2">
										<svg class="w-3.5 h-3.5 text-[#D4AF37]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
										<span class="text-[10px] font-bold text-slate-700 dark:text-slate-350 group-hover/action:text-[#D4AF37] transition-colors">Administrar Reservas</span>
									</div>
									<svg class="w-3 h-3 text-slate-400 group-hover/action:translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
								</a>
							</div>
						</div>
					</div>

					<!-- Bottom Navigation Button -->
					<div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
						<button class="w-full py-2.5 rounded-xl bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest transition-all" onclick={goToReservations}>
							Ver Ocupación Completa
						</button>
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
										<span class="font-bold">Habitación {res.room?.number}</span>
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
