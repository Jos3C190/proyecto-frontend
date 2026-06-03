<script lang="ts">
	import { fade, slide, fly } from 'svelte/transition';
	import { 
		TrendingUp, BarChart3, PieChart, FileText, Download, 
		Calendar, Filter, DollarSign, Users, BedDouble, 
		Activity, ChevronDown, FileSpreadsheet, ExternalLink,
		CalendarDays, ArrowUpRight, ArrowDownRight,
		Clock, MapPin, Star, ChevronLeft, RefreshCw, AlertCircle
	} from 'lucide-svelte';
	
	import { onMount } from 'svelte';
	import '../../admin/adminPage.css';
	import * as reportService from '$lib/services/report.service';
	import { fetchSystemSettings, type HotelInfo } from '$lib/services/admin.service';
	import { downloadCSV, downloadVectorPDF } from '$lib/utils/exportUtils';

	// Componentes de gráficos SVG premium
	import ReportBarChart from '$lib/components/ui/ReportBarChart.svelte';
	import ReportPieChart from '$lib/components/ui/ReportPieChart.svelte';
	import ReportLineChart from '$lib/components/ui/ReportLineChart.svelte';

	// --- Estados Reactivos (Runes de Svelte 5) ---
	let selectedTab = $state<'summary' | 'financial' | 'occupancy' | 'customers' | 'extras'>('summary');
	let selectedRange = $state<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('month');
	
	// Fechas personalizadas
	let customStartDate = $state('');
	let customEndDate = $state('');

	// Estado de carga y error
	let isLoading = $state(false);
	let isExporting = $state(false);
	let errorMsg = $state<string | null>(null);
	let activeTooltip = $state<string | null>(null);
	let roomTypeViewMode = $state<'net' | 'gross'>('net');
	let paymentMethodViewMode = $state<'net' | 'gross'>('net');
	let dailyRevenueViewMode = $state<'net' | 'gross'>('net');
	let customerViewMode = $state<'net' | 'gross'>('net');
	let extrasViewMode = $state<'net' | 'gross'>('net');

	// Contenedores de datos de reportes
	let summaryData = $state<reportService.ExecutiveSummary | null>(null);
	let financialData = $state<reportService.FinancialReport | null>(null);
	let occupancyData = $state<reportService.OccupancyReport | null>(null);
	let customerData = $state<reportService.CustomerReport | null>(null);
	let extrasData = $state<reportService.ExtrasReport | null>(null);

	// Información dinámica del hotel
	let hotelInfo = $state<HotelInfo>({ name: 'AFE Resort & Spa', phone: '', email: '' });

	const methodTranslations: Record<string, string> = {
		card: 'Tarjeta',
		cash: 'Efectivo',
		transfer: 'Transferencia',
		refund: 'Reembolso'
	};

	onMount(async () => {
		try {
			const settings = await fetchSystemSettings();
			hotelInfo = {
				name: settings.find(s => s.key === 'hotel_name')?.value || 'AFE Resort & Spa',
				phone: settings.find(s => s.key === 'hotel_phone')?.value || '',
				email: settings.find(s => s.key === 'hotel_email')?.value || ''
			};
		} catch (err) {
			console.error('Error al cargar datos del hotel para PDF:', err);
		}
	});

	// --- Lógica de Rangos de Fechas ---
	function getFormattedDate(d: Date): string {
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}

	// Cálculo reactivo de fechas de inicio y fin en base al selector
	let dateRange = $derived.by(() => {
		const today = new Date();
		
		if (selectedRange === 'today') {
			const dStr = getFormattedDate(today);
			return { start: dStr, end: dStr };
		}
		
		if (selectedRange === 'week') {
			const day = today.getDay();
			const diff = today.getDate() - day + (day === 0 ? -6 : 1); // lunes
			const monday = new Date(today.setDate(diff));
			
			const sunday = new Date(monday);
			sunday.setDate(monday.getDate() + 6);
			
			return { 
				start: getFormattedDate(monday), 
				end: getFormattedDate(sunday) 
			};
		}
		
		if (selectedRange === 'month') {
			const start = new Date(today.getFullYear(), today.getMonth(), 1);
			const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
			return { 
				start: getFormattedDate(start), 
				end: getFormattedDate(end) 
			};
		}
		
		if (selectedRange === 'quarter') {
			// Últimos 90 días
			const start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
			return { 
				start: getFormattedDate(start), 
				end: getFormattedDate(today) 
			};
		}
		
		if (selectedRange === 'year') {
			const start = new Date(today.getFullYear(), 0, 1);
			const end = new Date(today.getFullYear(), 11, 31);
			return { 
				start: getFormattedDate(start), 
				end: getFormattedDate(end) 
			};
		}
		
		// Rango personalizado
		return { 
			start: customStartDate || getFormattedDate(new Date(today.getFullYear(), today.getMonth(), 1)), 
			end: customEndDate || getFormattedDate(today) 
		};
	});

	// Inicializar fechas personalizadas con valores razonables
	$effect(() => {
		if (selectedRange === 'custom' && (!customStartDate || !customEndDate)) {
			const today = new Date();
			customStartDate = getFormattedDate(new Date(today.getFullYear(), today.getMonth(), 1));
			customEndDate = getFormattedDate(today);
		}
	});

	// --- Carga de Datos desde la API ---
	async function loadReportData() {
		isLoading = true;
		errorMsg = null;
		
		const { start, end } = dateRange;

		try {
			if (selectedTab === 'summary') {
				summaryData = await reportService.getExecutiveSummary(start, end);
			} else if (selectedTab === 'financial') {
				financialData = await reportService.getFinancialReport(start, end);
			} else if (selectedTab === 'occupancy') {
				occupancyData = await reportService.getOccupancyReport(start, end);
			} else if (selectedTab === 'customers') {
				customerData = await reportService.getCustomerReport(start, end);
			} else if (selectedTab === 'extras') {
				extrasData = await reportService.getExtrasReport(start, end);
			}
		} catch (err: any) {
			console.error('Error al cargar reporte:', err);
			errorMsg = err.message || 'Error de conexión con el servidor.';
		} finally {
			isLoading = false;
		}
	}

	// Recargar datos reactivamente cuando cambian los inputs
	$effect(() => {
		// Dependencias reactivas
		const tab = selectedTab;
		const range = selectedRange;
		const start = customStartDate;
		const end = customEndDate;
		
		loadReportData();
	});

	// --- Exportaciones (CSV y PDF en Frontend) ---
	async function handleExportPDF() {
		if (isExporting) return;
		isExporting = true;
		const rangeText = `${dateRange.start} al ${dateRange.end}`;
		
		try {
			let details = null;
			if (selectedTab === 'financial') details = financialData;
			else if (selectedTab === 'occupancy') details = occupancyData;
			else if (selectedTab === 'customers') details = customerData;
			else if (selectedTab === 'extras') details = extrasData;
			
			await downloadVectorPDF(selectedTab, rangeText, summaryData, details, hotelInfo);
		} catch (err: any) {
			alert(err.message || 'Error al exportar PDF.');
		} finally {
			isExporting = false;
		}
	}

	function handleExportCSV() {
		const rangeLabel = selectedRange === 'custom' ? `${dateRange.start}_a_${dateRange.end}` : selectedRange;
		const prefix = hotelInfo.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15);
		const filename = `${prefix}_Datos_${selectedTab.toUpperCase()}_${rangeLabel}.csv`;

		if (selectedTab === 'financial' && financialData) {
			const headers = [
				'Fecha', 
				'Ingresos Habitación (Neto)', 
				'Ingresos Extras (Neto)', 
				'Ingresos Incidentales (Neto)', 
				'IVA Recaudado (13%)', 
				'Impuesto de Turismo (5%)', 
				'Ingresos Totales (Caja Neto)'
			];
			const rows = financialData.daily_revenue.map(item => {
				const tourismTax = Number(item.room_revenue || 0) * 0.05;
				const ivaTax = Math.max(0, Number(item.tax_revenue || 0) - tourismTax);
				return [
					item.date,
					item.room_revenue,
					item.extra_revenue,
					item.incidental_revenue || 0,
					Number(ivaTax.toFixed(2)),
					Number(tourismTax.toFixed(2)),
					item.total_revenue
				];
			});
			downloadCSV(headers, rows, filename);
		} 
		else if (selectedTab === 'occupancy' && occupancyData) {
			const headers = ['Habitación', 'Tipo', 'Noches Ocupadas', 'Porcentaje Ocupación', 'Ingresos Estimados'];
			const rows = occupancyData.room_occupancy.map(item => [
				item.room_number,
				item.room_type,
				item.occupied_nights,
				`${item.occupancy_pct}%`,
				item.revenue
			]);
			downloadCSV(headers, rows, filename);
		} 
		else if (selectedTab === 'customers' && customerData) {
			const headers = ['ID Usuario', 'Nombre', 'Email', 'Reservaciones Creadas', 'Total Pagado ($)'];
			const rows = customerData.top_customers.map(item => [
				item.user_id,
				item.name,
				item.email,
				item.reservations_count,
				item.total_spent
			]);
			downloadCSV(headers, rows, filename);
		} 
		else if (selectedTab === 'extras' && extrasData) {
			const headers = ['ID Extra', 'Nombre', 'Categoría', 'Cantidad Vendida', 'Ingresos Generados'];
			const rows = extrasData.top_extras.map(item => [
				item.extra_id,
				item.name,
				item.category,
				item.quantity_sold,
				item.revenue
			]);
			downloadCSV(headers, rows, filename);
		}
		else {
			// Por defecto o sumario
			if (summaryData) {
				const headers = ['Métrica', 'Valor'];
				const rows = [
					['Ingresos Totales', summaryData.total_revenue],
					['Ocupación Media (%)', summaryData.occupancy_rate],
					['Tarifa Diaria Promedio (ADR)', summaryData.adr],
					['Ingreso Habitación Disponible (RevPAR)', summaryData.rev_par],
					['Total Reservaciones', summaryData.total_reservations],
					['Tasa de Cancelación (%)', summaryData.cancellation_rate],
					['Crecimiento de Ingresos (%)', summaryData.revenue_growth_pct]
				];
				downloadCSV(headers, rows, filename);
			}
		}
	}

	function formatHumanDate(dateStr: string) {
		if (!dateStr) return '';
		const parts = dateStr.split('-');
		if (parts.length !== 3) return dateStr;
		const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
		return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<svelte:window onclick={() => activeTooltip = null} />

<div class="admin-page fade-in">
	<!-- Header -->
	<div class="admin-header-container">
		<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 w-full">
			<div>
				<div class="flex items-center gap-3">
					{#if selectedTab !== 'summary'}
						<button 
							onclick={() => selectedTab = 'summary'}
							class="p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
						>
							<ChevronLeft class="w-5 h-5" />
						</button>
					{/if}
					<h1 class="admin-title">Inteligencia de Negocio</h1>
					
					<!-- Super compact dynamic date badge next to title (Desktop only) -->
					<div class="hidden md:flex items-center gap-1.5 px-3 py-1 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-md text-[10px] font-bold text-slate-500 dark:text-slate-450 select-none">
						<CalendarDays class="w-3.5 h-3.5 text-[#D4AF37]" />
						<span>{formatHumanDate(dateRange.start)} - {formatHumanDate(dateRange.end)}</span>
					</div>
				</div>
				<p class="admin-desc">
					Reportes analíticos, KPIs en tiempo real y exportaciones del complejo.
					<!-- Dynamic date text inside description (Mobile only) -->
					<span class="inline md:hidden text-[#D4AF37] font-black">({formatHumanDate(dateRange.start)} - {formatHumanDate(dateRange.end)})</span>
				</p>
			</div>
 
			<!-- Micro Date range selector + picker -->
			<div class="flex items-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm max-w-full">
				<button 
					onclick={() => selectedRange = 'today'}
					class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all {selectedRange === 'today' ? 'bg-[#D4AF37] text-[#0B0E14] font-black shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}"
				>
					Hoy
				</button>
				<button 
					onclick={() => selectedRange = 'week'}
					class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all {selectedRange === 'week' ? 'bg-[#D4AF37] text-[#0B0E14] font-black shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}"
				>
					Semana
				</button>
				<button 
					onclick={() => selectedRange = 'month'}
					class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all {selectedRange === 'month' ? 'bg-[#D4AF37] text-[#0B0E14] font-black shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}"
				>
					Mes
				</button>
				<button 
					onclick={() => selectedRange = 'quarter'}
					class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all {selectedRange === 'quarter' ? 'bg-[#D4AF37] text-[#0B0E14] font-black shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}"
				>
					90 Días
				</button>
				<button 
					onclick={() => selectedRange = 'year'}
					class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all {selectedRange === 'year' ? 'bg-[#D4AF37] text-[#0B0E14] font-black shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}"
				>
					Año
				</button>
				<button 
					onclick={() => selectedRange = 'custom'}
					class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all {selectedRange === 'custom' ? 'bg-[#D4AF37] text-[#0B0E14] font-black shadow-sm' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}"
				>
					Rango exacto
				</button>
 
				{#if selectedRange === 'custom'}
					<div class="flex items-center gap-1 border-l border-slate-200/50 dark:border-slate-800/50 pl-2 transition-all duration-300" transition:slide={{ axis: 'x' }}>
						<div class="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-850 rounded-lg px-2 py-1 focus-within:border-[#D4AF37] transition-all">
							<input 
								type="date" 
								bind:value={customStartDate} 
								class="bg-transparent border-none text-[10px] font-bold text-slate-700 dark:text-white outline-none w-20 p-0 cursor-pointer"
							/>
							<span class="text-[10px] text-gray-400 font-bold mx-1 select-none">a</span>
							<input 
								type="date" 
								bind:value={customEndDate} 
								class="bg-transparent border-none text-[10px] font-bold text-slate-700 dark:text-white outline-none w-20 p-0 cursor-pointer"
							/>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="admin-content-grid space-y-8">
		
		{#if isLoading}
			<div class="flex flex-col items-center justify-center py-20 gap-4">
				<RefreshCw class="w-10 h-10 text-[#D4AF37] animate-spin" />
				<p class="text-sm font-bold text-gray-400">Consultando y estructurando base de datos analítica...</p>
			</div>
		{:else if errorMsg}
			<div class="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-3xl flex items-start gap-4">
				<AlertCircle class="w-6 h-6 shrink-0 mt-0.5" />
				<div>
					<h3 class="font-bold text-base mb-1">Ocurrió un error al cargar el reporte</h3>
					<p class="text-xs leading-relaxed opacity-80">{errorMsg}</p>
					<button 
						onclick={loadReportData}
						class="mt-4 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors"
					>
						Reintentar conexión
					</button>
				</div>
			</div>
		{:else}

			<!-- Printable Report Area -->
			<div id="report-printable-area" class="space-y-8">
				
				<!-- Header para el PDF impreso (oculto en pantalla ordinaria) -->
				<div class="hidden-on-screen border-b border-slate-800 pb-6 mb-6">
					<div class="flex items-center justify-between">
						<div>
							<h1 class="text-2xl font-black tracking-wider text-[#D4AF37]">{hotelInfo.name.toUpperCase()}</h1>
							<p class="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">Informe Ejecutivo Administrativo</p>
						</div>
						<div class="text-right text-xs text-slate-400">
							<p>Reporte: <span class="text-white font-bold">{selectedTab.toUpperCase()}</span></p>
							<p>Rango: <span class="text-white font-bold">{dateRange.start} al {dateRange.end}</span></p>
						</div>
					</div>
				</div>

				<!-- --- VISTA: RESUMEN EJECUTIVO (SUMMARY) --- -->
				{#if selectedTab === 'summary' && summaryData}
					<div in:fade>
						<!-- KPIs Principales -->
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
							<!-- Card 1: Ingresos Totales -->
							<div class="admin-kpi-card group !overflow-visible">
								<div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
								<div class="flex items-center justify-between mb-4">
									<div class="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-500">
										<DollarSign class="w-5 h-5" />
									</div>
									<div class="flex items-center gap-1.5 font-sans relative !overflow-visible">
										<span class="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full {summaryData.revenue_growth_pct >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}">
											{#if summaryData.revenue_growth_pct >= 0}
												<ArrowUpRight class="w-3 h-3" />
												+{summaryData.revenue_growth_pct}%
											{:else}
												<ArrowDownRight class="w-3 h-3" />
												{summaryData.revenue_growth_pct}%
											{/if}
											<button type="button" class="cursor-pointer ml-1 text-slate-400 hover:text-emerald-500 transition-colors p-0.5 focus:outline-none" 
												onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'summary_revenue' ? null : 'summary_revenue'; }}>
												<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
											</button>
										</span>
										{#if activeTooltip === 'summary_revenue'}
											<div class="absolute bottom-full right-0 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
												<p class="font-bold text-emerald-400 mb-1">Ingresos Totales</p>
												<p>Suma total del dinero percibido y cobrado en caja durante el periodo. Incluye los ingresos por <span class="text-white font-bold">Habitaciones</span>, <span class="text-white font-bold">Servicios Extras</span>, e <span class="text-white font-bold">Incidentales</span> con sus respectivos impuestos.</p>
												<div class="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
											</div>
										{/if}
									</div>
								</div>
								<h3 class="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">Ingresos Totales</h3>
								<p class="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
									${summaryData.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</p>
							</div>

							<!-- Card 2: Ocupación Media -->
							<div class="admin-kpi-card group !overflow-visible">
								<div class="absolute -right-4 -top-4 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-2xl group-hover:bg-[#D4AF37]/10 transition-colors"></div>
								<div class="flex items-center justify-between mb-4">
									<div class="p-2.5 bg-[#D4AF37]/10 rounded-2xl text-[#D4AF37]">
										<BedDouble class="w-5 h-5" />
									</div>
									<div class="flex items-center gap-1.5 font-sans relative !overflow-visible">
										<span class="text-[10px] font-extrabold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
											Ocupación
											<button type="button" class="cursor-pointer text-[#D4AF37]/80 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none" 
												onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'summary_occ' ? null : 'summary_occ'; }}>
												<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
											</button>
										</span>
										{#if activeTooltip === 'summary_occ'}
											<div class="absolute bottom-full right-0 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
												<p class="font-bold text-[#D4AF37] mb-1">Ocupación Media</p>
												<p>Porcentaje promedio de habitaciones ocupadas. Se calcula dividiendo las <span class="text-white font-bold">Noches Vendidas</span> entre la capacidad total disponible (<span class="text-white font-bold">Habitaciones Activas × Días del Periodo</span>), multiplicado por 100.</p>
												<div class="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
											</div>
										{/if}
									</div>
								</div>
								<h3 class="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">Ocupación Media</h3>
								<p class="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">{summaryData.occupancy_rate}%</p>
								<div class="mt-4 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
									<div class="h-full bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]" style="width: {summaryData.occupancy_rate}%"></div>
								</div>
							</div>

							<!-- Card 3: Tarifa Promedio (ADR) -->
							<div class="admin-kpi-card group !overflow-visible">
								<div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
								<div class="flex items-center justify-between mb-4">
									<div class="p-2.5 bg-blue-500/10 rounded-2xl text-blue-500">
										<TrendingUp class="w-5 h-5" />
									</div>
									<div class="flex items-center gap-1.5 font-sans relative !overflow-visible">
										<span class="text-[10px] font-extrabold text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
											ADR
											<button type="button" class="cursor-pointer text-blue-400 hover:text-blue-600 transition-colors p-0.5 focus:outline-none" 
												onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'summary_adr' ? null : 'summary_adr'; }}>
												<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
											</button>
										</span>
										{#if activeTooltip === 'summary_adr'}
											<div class="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium normal-case font-sans" transition:fade>
												<p class="font-bold text-[#D4AF37] mb-1">Tarifa Media Diaria (ADR Operativo Bruto)</p>
												<p>Calculado bajo <strong>criterio de devengo</strong>. Mide el precio bruto promedio de las habitaciones ocupadas por reservaciones que inician en este período (independientemente de cuándo se cobren). Es el mejor indicador para medir el rendimiento de tus noches operadas.</p>
												<div class="absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
											</div>
										{/if}
									</div>
								</div>
								<h3 class="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">Tarifa Media Diaria (Devengo)</h3>
								<p class="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">
									${summaryData.adr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</p>
							</div>

							<!-- Card 4: Tasa de Cancelación -->
							<div class="admin-kpi-card group !overflow-visible">
								<div class="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors"></div>
								<div class="flex items-center justify-between mb-4">
									<div class="p-2.5 bg-red-500/10 rounded-2xl text-red-500">
										<AlertCircle class="w-5 h-5" />
									</div>
									<div class="flex items-center gap-1.5 font-sans relative !overflow-visible">
										<span class="text-[10px] font-extrabold {summaryData.cancellation_rate > 10 ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'} px-2.5 py-1 rounded-full flex items-center gap-1">
											{summaryData.cancellation_rate > 10 ? 'Revisar' : 'Saludable'}
											<button type="button" class="cursor-pointer text-slate-400 hover:text-red-400 transition-colors p-0.5 focus:outline-none" 
												onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'summary_cancellation' ? null : 'summary_cancellation'; }}>
												<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
											</button>
										</span>
										{#if activeTooltip === 'summary_cancellation'}
											<div class="absolute bottom-full right-0 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
												<p class="font-bold text-red-400 mb-1">Tasa de Cancelación</p>
												<p>Porcentaje de reservaciones que fueron canceladas en el periodo. Se obtiene dividiendo las <span class="text-white font-bold">Reservas Canceladas</span> entre el <span class="text-white font-bold">Total de Reservas</span> (activas + canceladas), multiplicado por 100.</p>
												<div class="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
											</div>
										{/if}
									</div>
								</div>
								<h3 class="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-1">Tasa de Cancelación</h3>
								<p class="text-2xl font-black text-slate-900 dark:text-white font-['Outfit']">{summaryData.cancellation_rate}%</p>
								<div class="mt-4 flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-gray-400">
									<Clock class="w-3.5 h-3.5" />
									<span>Total Reservas: {summaryData.total_reservations}</span>
								</div>
							</div>
						</div>

						<!-- Catálogo Bento de Reportes Detallados -->
						<section>
							<div class="flex items-center gap-3 mb-6">
								<div class="p-2 bg-[#D4AF37]/10 rounded-lg text-[#D4AF37]">
									<BarChart3 class="w-5 h-5" />
								</div>
								<h2 class="text-xl font-extrabold text-slate-800 dark:text-white font-['Outfit'] tracking-tight">Catálogo de Reportes Detallados</h2>
							</div>

							<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
									
									<!-- Reporte Financiero Card -->
									<button 
										onclick={() => selectedTab = 'financial'}
										class="admin-kpi-card admin-kpi-card-interactive text-left group flex flex-col justify-between min-h-[190px]"
									>
										<div>
											<div class="flex items-center justify-between mb-3">
												<div class="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
													<DollarSign class="w-6 h-6" />
												</div>
												<span class="text-[9px] font-bold text-slate-500 dark:text-gray-600 group-hover:text-[#D4AF37] transition-colors uppercase tracking-widest">Ver Detalles</span>
											</div>
											<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Finanzas y Rentabilidad</h3>
											<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Ingresos consolidados, impuestos IVA e ingresos detallados por métodos de pago.</p>
										</div>
									</button>

									<!-- Reporte de Ocupación Card -->
									<button 
										onclick={() => selectedTab = 'occupancy'}
										class="admin-kpi-card admin-kpi-card-interactive text-left group flex flex-col justify-between min-h-[190px]"
									>
										<div>
											<div class="flex items-center justify-between mb-3">
												<div class="p-3 bg-[#D4AF37]/10 text-[#D4AF37] rounded-2xl group-hover:scale-110 transition-transform">
													<BedDouble class="w-6 h-6" />
												</div>
												<span class="text-[9px] font-bold text-slate-500 dark:text-gray-600 group-hover:text-[#D4AF37] transition-colors uppercase tracking-widest">Ver Detalles</span>
											</div>
											<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Ocupación y Logística</h3>
											<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Log de pernoctación de habitaciones, noches vendidas y rendimiento de ocupación general.</p>
										</div>
									</button>

									<!-- Reporte de Clientes Card -->
									<button 
										onclick={() => selectedTab = 'customers'}
										class="admin-kpi-card admin-kpi-card-interactive text-left group flex flex-col justify-between min-h-[190px]"
									>
										<div>
											<div class="flex items-center justify-between mb-3">
												<div class="p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
													<Users class="w-6 h-6" />
												</div>
												<span class="text-[9px] font-bold text-slate-500 dark:text-gray-600 group-hover:text-[#D4AF37] transition-colors uppercase tracking-widest">Ver Detalles</span>
											</div>
											<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Análisis de Clientes</h3>
											<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Top huéspedes por nivel de gasto, tasa de retención, nuevos perfiles y países de procedencia.</p>
										</div>
									</button>

									<!-- Reporte de Extras Card -->
									<button 
										onclick={() => selectedTab = 'extras'}
										class="admin-kpi-card admin-kpi-card-interactive text-left group flex flex-col justify-between min-h-[190px]"
									>
										<div>
											<div class="flex items-center justify-between mb-3">
												<div class="p-3 bg-purple-500/10 text-purple-500 rounded-2xl group-hover:scale-110 transition-transform">
													<Activity class="w-6 h-6" />
												</div>
												<span class="text-[9px] font-bold text-slate-500 dark:text-gray-600 group-hover:text-[#D4AF37] transition-colors uppercase tracking-widest">Ver Detalles</span>
											</div>
											<h3 class="text-lg font-bold text-slate-800 dark:text-white mb-1">Servicios y Extras</h3>
											<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Desglose de amenidades adicionales, alimentos, spa y consumos extras contratados en el resort.</p>
										</div>
									</button>

								</div>

								<!-- Centro de Descarga Consolidado -->
								<div class="bg-[#D4AF37]/10 dark:bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-8 text-slate-800 dark:text-white relative overflow-hidden flex flex-col justify-between min-h-[400px] shadow-xl shadow-[#D4AF37]/5 backdrop-blur-md transition-all">
									<div class="absolute top-0 right-0 p-8 opacity-10">
										<Download class="w-32 h-32 text-[#D4AF37]" />
									</div>
									
									<div>
										<h2 class="text-2xl font-black font-['Outfit'] mb-2">Exportar Resumen</h2>
										<p class="text-slate-500 dark:text-slate-400 text-xs mb-8 leading-relaxed">
											Descarga los datos clave del sumario del período seleccionado en formato plano CSV o un reporte estructurado en PDF.
										</p>

										<div class="space-y-4">
											<button 
												onclick={handleExportPDF}
												disabled={isExporting}
												class="w-full py-4 bg-[#D4AF37] text-slate-950 rounded-2xl font-extrabold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#D4AF37]/20 disabled:opacity-50"
											>
												{#if isExporting}
													<div class="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
												{:else}
													<FileText class="w-5 h-5" />
												{/if}
												Informe PDF General
											</button>

											<button 
												onclick={handleExportCSV}
												class="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white border border-slate-200 dark:border-gray-800 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
											>
												<FileSpreadsheet class="w-5 h-5" />
												Datos Planos CSV
											</button>
										</div>
									</div>

									<div class="mt-8 pt-8 border-t border-slate-200 dark:border-gray-800/50 flex items-center gap-3 text-[10px] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-wider">
										<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
										Sincronizado con SQL Server
									</div>
								</div>
							</div>
						</section>
					</div>
				{/if}

				<!-- --- VISTA: REPORTE FINANCIERO DETALLADO --- -->
				{#if selectedTab === 'financial' && financialData}
					{@const totalRoomNet = financialData.room_revenue}
					{@const totalExtrasNet = financialData.extra_revenue}
					{@const totalIncNet = financialData.incidental_revenue || 0}
					{@const totalNetSales = totalRoomNet + totalExtrasNet + totalIncNet}
					{@const totalGrossRevenue = totalNetSales + (financialData.tax_revenue || 0)}
					{@const totalIvaBase = totalRoomNet + totalExtrasNet + totalIncNet}
					{@const tourismTax = totalRoomNet * 0.05}
					{@const ivaTax = Math.max(0, (financialData.tax_revenue || 0) - tourismTax)}
					
					{@const cardMethod = financialData.revenue_by_method.find(m => m.method.toLowerCase() === 'card')}
					{@const cardAmount = cardMethod ? cardMethod.amount : 0}
					{@const cardCount = cardMethod ? cardMethod.count : 0}
					{@const wompiCommission = cardAmount * 0.035}
					{@const wompiCommissionIva = wompiCommission * 0.13}
					{@const ivaRetention2pct = cardAmount * 0.02}
					{@const totalWompiDiscount = wompiCommission + wompiCommissionIva + ivaRetention2pct}
					{@const nonCardAmount = financialData.total_revenue - cardAmount}
					{@const estimatedNetInBank = financialData.total_revenue - totalWompiDiscount}

					{@const roomGross = totalRoomNet * 1.18}
					{@const extrasGross = totalExtrasNet * 1.13}
					{@const incGross = totalIncNet * 1.13}
					<div in:fade class="space-y-8">
						<!-- Sub-Header con Botón Volver y Exportaciones del Reporte -->
						<div class="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md">
							<span class="text-sm font-bold text-[#D4AF37] uppercase tracking-wider pl-2">Reporte Financiero</span>
							<div class="flex gap-2.5">
								<button 
									onclick={handleExportCSV}
									class="px-4 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all border border-slate-200/50 dark:border-transparent"
								>
									<FileSpreadsheet class="w-4 h-4 text-[#D4AF37]" />
									Exportar CSV
								</button>
								<button 
									onclick={handleExportPDF}
									disabled={isExporting}
									class="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
								>
									{#if isExporting}
										<div class="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
									{:else}
										<FileText class="w-4 h-4" />
									{/if}
									Exportar PDF
								</button>
							</div>
						</div>

						<!-- Métricas Financieras y Control Fiscal (Sinfonía Contable) -->
						<div class="space-y-6">
							<!-- Fila 1: Métricas de Caja y Control Fiscal -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
								<!-- Card 1: Ingresos Totales (Caja) -->
								<div class="admin-kpi-card !p-5 relative !overflow-visible flex flex-col justify-between h-full">
									<div>
										<div class="flex justify-between items-start">
											<span class="text-[10px] uppercase font-extrabold text-slate-500 dark:text-gray-400 tracking-widest flex items-center">
												Ingresos Totales (Caja)
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'card_totals' ? null : 'card_totals'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'card_totals'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															<p class="font-bold text-[#D4AF37] mb-1">Caja y Ventas Consolidadas</p>
															<p>El valor <span class="text-white font-bold">Neto</span> refleja las ventas reales de servicios libres de tributos. El valor <span class="text-white font-bold">Con Impuestos</span> es la caja bruta ingresada incluyendo el IVA y el impuesto de Turismo.</p>
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
										</div>
										
										<!-- Secciones de Neto y Con Impuesto -->
										<div class="mt-4 space-y-3.5">
											<!-- Neto -->
											<div>
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
													Neto (Ventas Sin Impuestos)
												</div>
												<p class="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] leading-tight mt-0.5">
													${totalNetSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</p>
											</div>

											<!-- Bruto / Con Impuestos -->
											<div class="pt-2 border-t border-slate-100 dark:border-slate-800/40">
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
													Con Impuestos (Caja Bruta)
												</div>
												<p class="text-lg font-bold text-slate-700 dark:text-slate-350 font-['Outfit'] leading-tight mt-0.5">
													${totalGrossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</p>
											</div>
										</div>
									</div>
								</div>

								<!-- Card 2: Impuestos Recaudados -->
								<div class="admin-kpi-card !p-5 relative !overflow-visible flex flex-col justify-between h-full">
									<div>
										<div class="flex justify-between items-start">
											<span class="text-[10px] uppercase font-extrabold text-[#D4AF37] tracking-widest flex items-center">
												Impuestos Recaudados
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'card_tax' ? null : 'card_tax'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'card_tax'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															<p class="font-bold text-[#D4AF37] mb-1">Impuestos Recaudados</p>
															<p>Suma total de tributos recaudados: <span class="text-white font-bold">13% IVA</span> sobre todos los consumos y el <span class="text-white font-bold">5% de Turismo</span> sobre alojamiento.</p>
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
										</div>
										
										<div class="mt-4 space-y-3.5">
											<!-- Total Recaudado -->
											<div>
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
													Total Impuestos (13% + 5%)
												</div>
												<p class="text-xl font-extrabold text-[#D4AF37] font-['Outfit'] leading-tight mt-0.5">
													${(financialData.tax_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</p>
											</div>

											<!-- Desglose -->
											<div class="pt-2 border-t border-slate-100 dark:border-slate-800/40 grid grid-cols-2 gap-2">
												<div>
													<span class="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase block tracking-wider">IVA (13%)</span>
													<span class="text-xs font-bold text-slate-700 dark:text-slate-350 font-mono">${ivaTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
												</div>
												<div>
													<span class="text-[8px] font-bold text-slate-400 dark:text-gray-500 uppercase block tracking-wider">Turismo (5%)</span>
													<span class="text-xs font-bold text-slate-700 dark:text-slate-350 font-mono">${tourismTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
												</div>
											</div>
										</div>
									</div>
								</div>

								<!-- Card 3: Rendimiento RevPAR & ADR -->
								<div class="admin-kpi-card !p-5 relative !overflow-visible flex flex-col justify-between h-full">
									<div>
										<div class="flex justify-between items-start">
											<span class="text-[10px] uppercase font-extrabold text-slate-500 dark:text-gray-400 tracking-widest flex items-center">
												Eficiencia de Hospedaje
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'card_revpar' ? null : 'card_revpar'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'card_revpar'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															<p class="font-bold text-[#D4AF37] mb-1">Métricas de Ocupación e Ingresos</p>
															<p><span class="text-white font-bold">ADR Financiero</span> es la tarifa promedio neta (sin impuestos) calculada a partir de los <strong>pagos reales cobrados</strong> en caja durante el período. Puede diferir del ADR operativo de reservas si ingresan pagos anticipados para meses futuros.</p>
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
										</div>
										
										<div class="mt-4 space-y-3.5">
											<!-- RevPAR -->
											<div>
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
													Ingreso RevPAR
												</div>
												<p class="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] leading-tight mt-0.5">
													${financialData.rev_par.toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</p>
											</div>

											<!-- ADR -->
											<div class="pt-2 border-t border-slate-100 dark:border-slate-800/40">
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
													Tarifa Promedio ADR (Caja Neto)
												</div>
												<p class="text-lg font-bold text-slate-700 dark:text-slate-350 font-['Outfit'] leading-tight mt-0.5">
													${financialData.adr.toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>

							<!-- Fila 2: Desglose por Categoría Contable -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
								<!-- Card 4: Habitaciones -->
								<div class="admin-kpi-card !p-5 relative !overflow-visible flex flex-col justify-between h-full">
									<div>
										<div class="flex justify-between items-start">
											<span class="text-[10px] uppercase font-extrabold text-slate-500 dark:text-gray-400 tracking-widest flex items-center">
												Habitaciones
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'card_room' ? null : 'card_room'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'card_room'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															<p class="font-bold text-[#D4AF37] mb-1">Distribución de Alojamiento</p>
															<p>Muestra el desglose de ingresos por hospedaje. El valor <span class="text-white font-bold">Neto</span> es libre de tributos, mientras que el valor <span class="text-white font-bold">Con Impuestos</span> incluye el 13% de IVA y el 5% de Turismo (18% total).</p>
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
										</div>
										
										<!-- Secciones de Neto y Con Impuesto -->
										<div class="mt-4 space-y-3.5">
											<!-- Neto -->
											<div>
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
													Neto (Sin Impuestos)
												</div>
												<p class="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] leading-tight mt-0.5">
													${financialData.room_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</p>
											</div>

											<!-- Bruto / Con Impuestos -->
											<div class="pt-2 border-t border-slate-100 dark:border-slate-800/40">
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
													Con Impuestos (18% Bruto)
												</div>
												<p class="text-lg font-bold text-slate-700 dark:text-slate-350 font-['Outfit'] leading-tight mt-0.5">
													${roomGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</p>
											</div>
										</div>
									</div>
								</div>

								<!-- Card 5: Extras -->
								<div class="admin-kpi-card !p-5 relative !overflow-visible flex flex-col justify-between h-full">
									<div>
										<div class="flex justify-between items-start">
											<span class="text-[10px] uppercase font-extrabold text-slate-500 dark:text-gray-400 tracking-widest flex items-center">
												Servicios Extras
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'card_extra' ? null : 'card_extra'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'card_extra'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															<p class="font-bold text-[#D4AF37] mb-1">Servicios Adicionales</p>
															<p>Ingresos por tours, masajes y amenidades. El valor <span class="text-white font-bold">Neto</span> es libre de impuestos, y el valor <span class="text-white font-bold">Con Impuestos</span> incluye el 13% de IVA.</p>
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
										</div>
										
										<!-- Secciones de Neto y Con Impuesto -->
										<div class="mt-4 space-y-3.5">
											<!-- Neto -->
											<div>
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
													Neto (Sin Impuestos)
												</div>
												<p class="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] leading-tight mt-0.5">
													${financialData.extra_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</p>
											</div>

											<!-- Bruto / Con Impuestos -->
											<div class="pt-2 border-t border-slate-100 dark:border-slate-800/40">
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
													Con Impuestos (13% IVA Bruto)
												</div>
												<p class="text-lg font-bold text-slate-700 dark:text-slate-350 font-['Outfit'] leading-tight mt-0.5">
													${extrasGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</p>
											</div>
										</div>
									</div>
								</div>

								<!-- Card 6: Incidentales -->
								<div class="admin-kpi-card !p-5 relative !overflow-visible flex flex-col justify-between h-full">
									<div>
										<div class="flex justify-between items-start">
											<span class="text-[10px] uppercase font-extrabold text-slate-500 dark:text-gray-400 tracking-widest flex items-center">
												Cargos Incidentales
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'card_inc' ? null : 'card_inc'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'card_inc'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															<p class="font-bold text-[#D4AF37] mb-1">Cargos Incidentales</p>
															<p>Ingresos por daños, penalidades por check-out tardío o consumos ad-hoc. El valor <span class="text-white font-bold">Neto</span> es libre de impuestos, y el valor <span class="text-white font-bold">Con Impuestos</span> incluye el 13% de IVA.</p>
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
										</div>
										
										<!-- Secciones de Neto y Con Impuesto -->
										<div class="mt-4 space-y-3.5">
											<!-- Neto -->
											<div>
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
													Neto (Sin Impuestos)
												</div>
												<p class="text-xl font-extrabold text-slate-900 dark:text-white font-['Outfit'] leading-tight mt-0.5">
													${(financialData.incidental_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</p>
											</div>

											<!-- Bruto / Con Impuestos -->
											<div class="pt-2 border-t border-slate-100 dark:border-slate-800/40">
												<div class="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
													<div class="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
													Con Impuestos (13% IVA Bruto)
												</div>
												<p class="text-lg font-bold text-slate-700 dark:text-slate-350 font-['Outfit'] leading-tight mt-0.5">
													${incGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						<!-- Gráficos del Reporte Financiero -->
						<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<!-- Tendencia de Ingresos -->
							<div class="lg:col-span-2 admin-kpi-card">
								<div class="flex justify-between items-center mb-6">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tendencia de Ventas (Desglose Diario)</h3>
									<!-- Toggle Neto / Bruto -->
									<div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-750 shrink-0">
										<button 
											type="button" 
											onclick={() => dailyRevenueViewMode = 'net'} 
											class="px-2 py-1 rounded-md transition-all {dailyRevenueViewMode === 'net' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Neto
										</button>
										<button 
											type="button" 
											onclick={() => dailyRevenueViewMode = 'gross'} 
											class="px-2 py-1 rounded-md transition-all {dailyRevenueViewMode === 'gross' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Bruto
										</button>
									</div>
								</div>
								<ReportLineChart 
									data={financialData.daily_revenue.map(d => ({ 
										date: d.date, 
										value1: dailyRevenueViewMode === 'net' ? d.room_revenue : Number((d.room_revenue * 1.18).toFixed(2)), 
										value2: dailyRevenueViewMode === 'net' ? d.extra_revenue : Number((d.extra_revenue * 1.13).toFixed(2)), 
										value3: dailyRevenueViewMode === 'net' ? (d.incidental_revenue || 0) : Number(((d.incidental_revenue || 0) * 1.13).toFixed(2)) 
									}))}
									height={260}
									label1="Alojamiento"
									label2="Servicios Extras"
									label3="Cargos Incidentales"
								/>
							</div>

							<!-- Métodos de Pago -->
							<div class="admin-kpi-card">
								<div class="flex justify-between items-center mb-6">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Métodos de Pago</h3>
									<!-- Toggle Neto / Bruto -->
									<div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-750 shrink-0">
										<button 
											type="button" 
											onclick={() => paymentMethodViewMode = 'net'} 
											class="px-2 py-1 rounded-md transition-all {paymentMethodViewMode === 'net' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Neto
										</button>
										<button 
											type="button" 
											onclick={() => paymentMethodViewMode = 'gross'} 
											class="px-2 py-1 rounded-md transition-all {paymentMethodViewMode === 'gross' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Bruto
										</button>
									</div>
								</div>
								
								<ReportPieChart 
									data={financialData.revenue_by_method.map(m => ({ 
										label: (methodTranslations[m.method.toLowerCase()] || m.method).toUpperCase(), 
										value: paymentMethodViewMode === 'net' ? Number((m.amount * (financialData.total_revenue > 0 ? (totalNetSales / financialData.total_revenue) : 1)).toFixed(2)) : m.amount 
									}))}
									height={220}
									title={paymentMethodViewMode === 'net' ? 'Total Neto' : 'Total Bruto'}
								/>
							</div>
						</div>

						<!-- Desglose por Tipo de Habitación (Market Mix) + Libro Auxiliar Diario (Simetría Perfecta) -->
						<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<div class="lg:col-span-1 admin-kpi-card">
								<div class="flex justify-between items-center mb-6">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Ingresos por Tipo de Habitación</h3>
									<!-- Toggle Neto / Bruto -->
									<div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-750 shrink-0">
										<button 
											type="button" 
											onclick={() => roomTypeViewMode = 'net'} 
											class="px-2 py-1 rounded-md transition-all {roomTypeViewMode === 'net' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Neto
										</button>
										<button 
											type="button" 
											onclick={() => roomTypeViewMode = 'gross'} 
											class="px-2 py-1 rounded-md transition-all {roomTypeViewMode === 'gross' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Bruto
										</button>
									</div>
								</div>
								<ReportBarChart 
									data={financialData.room_type_revenue.map(r => ({ 
										label: r.room_type, 
										value: roomTypeViewMode === 'net' ? Number((r.revenue / 1.18).toFixed(2)) : r.revenue 
									}))}
									layout="horizontal"
									height={220}
								/>
							</div>

							<div class="lg:col-span-2 admin-kpi-card !p-0 overflow-hidden flex flex-col justify-between">
								<div class="p-5 border-b border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/10 flex items-center justify-between">
									<div>
										<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Libro Auxiliar Diario de Ingresos</h3>
										<p class="text-[10px] text-slate-400 mt-1">Desglose contable neto e impositivo registrado por fecha (Caja Neto)</p>
									</div>
								</div>
								<div class="overflow-x-auto max-h-[260px] overflow-y-auto">
									<table class="w-full text-left text-xs border-collapse">
										<thead>
											<tr class="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/25 sticky top-0 backdrop-blur-md z-10">
												<th class="p-3 font-bold">Fecha</th>
												<th class="p-3 font-bold text-right">Habitaciones</th>
												<th class="p-3 font-bold text-right">Extras</th>
												<th class="p-3 font-bold text-right">Incidentales</th>
												<th class="p-3 font-bold text-right text-emerald-500 dark:text-emerald-450">IVA (13%)</th>
												<th class="p-3 font-bold text-right text-amber-500 dark:text-amber-450">Turismo (5%)</th>
												<th class="p-3 font-bold text-right">Total Diario</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-600 dark:text-slate-350">
											{#each [...financialData.daily_revenue].sort((a, b) => b.date.localeCompare(a.date)) as item}
												{@const tourismTax = Number(item.room_revenue || 0) * 0.05}
												{@const ivaTax = Math.max(0, Number(item.tax_revenue || 0) - tourismTax)}
												{@const isToday = item.date === getFormattedDate(new Date())}
												<tr class="transition-colors {isToday ? 'bg-[#D4AF37]/5 dark:bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 dark:hover:bg-[#D4AF37]/10 border-l-2 border-l-[#D4AF37]' : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60'}" id={isToday ? 'ledger-today' : undefined}>
													<td class="p-3 font-semibold text-slate-800 dark:text-white font-mono whitespace-nowrap flex items-center gap-1.5">
														{formatHumanDate(item.date)}
														{#if isToday}
															<span class="px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#B8962A] dark:text-[#D4AF37] dark:bg-[#D4AF37]/30 rounded-md">Hoy</span>
														{/if}
													</td>
													<td class="p-3 text-right font-medium">
														${Number(item.room_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
													</td>
													<td class="p-3 text-right font-medium">
														${Number(item.extra_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
													</td>
													<td class="p-3 text-right font-medium">
														${Number(item.incidental_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
													</td>
													<td class="p-3 text-right font-semibold text-emerald-500 dark:text-emerald-450 font-mono">
														${ivaTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
													</td>
													<td class="p-3 text-right font-semibold text-amber-500 dark:text-amber-450 font-mono">
														${tourismTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
													</td>
													<td class="p-3 text-right font-black text-slate-800 dark:text-white font-mono">
														${Number(item.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						</div>

						<!-- HERRAMIENTAS DE CONCILIACIÓN Y DECLARACIÓN FISCAL (SUEÑO DE CONTABILIDAD) -->
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6" in:fade>
							<!-- Tarjeta 1: Resumen de Declaración Tributaria -->
							<div class="admin-kpi-card relative overflow-hidden group !py-5">
								<div class="absolute -right-4 -top-4 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-2xl group-hover:bg-[#D4AF37]/10 transition-colors"></div>
								<div class="p-1">
									<div class="flex items-center gap-3 mb-4">
										<div class="p-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-xl shrink-0">
											<FileText class="w-5 h-5" />
										</div>
										<div>
											<h3 class="text-sm font-bold text-slate-800 dark:text-white">Resumen de Declaración Tributaria</h3>
											<p class="text-[10px] text-slate-400 mt-0.5">Valores estimados listos para formularios fiscales del Ministerio de Hacienda (IVA / F987 / Turismo)</p>
										</div>
									</div>

									<div class="space-y-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 text-xs">
										<div class="flex justify-between">
											<span class="text-slate-500 dark:text-slate-400">Base Imponible IVA (13%)</span>
											<span class="font-bold text-slate-900 dark:text-white font-mono">${totalIvaBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-slate-500 dark:text-slate-400">IVA Débito Fiscal Estimado (13%)</span>
											<span class="font-bold text-emerald-500 dark:text-emerald-450 font-mono">${ivaTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between border-t border-slate-100/50 dark:border-gray-800/30 pt-2.5">
											<span class="text-slate-500 dark:text-slate-400">Base Contribución Especial Turismo (5%)</span>
											<span class="font-bold text-slate-900 dark:text-white font-mono">${totalRoomNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between">
											<span class="text-slate-500 dark:text-slate-400">Impuesto de Turismo Estimado (5%)</span>
											<span class="font-bold text-amber-500 dark:text-amber-450 font-mono">${tourismTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between border-t border-slate-200 dark:border-gray-700/60 pt-3 mt-1.5 font-bold text-slate-900 dark:text-white text-sm">
											<span>Total Obligaciones Fiscales</span>
											<span class="font-black text-[#D4AF37] font-mono">${(ivaTax + tourismTax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
									</div>
								</div>
							</div>

							<!-- Tarjeta 2: Estimador de Comisiones y Conciliación de Bancos -->
							<div class="admin-kpi-card relative overflow-hidden group !py-5">
								<div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
								<div class="p-1">
									<div class="flex items-center gap-3 mb-4">
										<div class="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
											<DollarSign class="w-5 h-5" />
										</div>
										<div>
											<h3 class="text-sm font-bold text-slate-800 dark:text-white">Conciliación de Pasarela y Caja Bancaria</h3>
											<p class="text-[10px] text-slate-400 mt-0.5">Cálculo de comisiones por canal de pago para verificar depósitos reales en banco</p>
										</div>
									</div>

									<div class="space-y-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 text-xs">
										<div class="flex justify-between">
											<span class="text-slate-500 dark:text-slate-400">Recaudado Tarjeta Wompi (con Impuestos)</span>
											<span class="font-bold text-slate-900 dark:text-white font-mono">
												${cardAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												<span class="text-[9px] text-slate-400 font-bold ml-1">({cardCount} cobros)</span>
											</span>
										</div>
										<div class="flex justify-between items-center">
											<span class="text-slate-500 dark:text-slate-400 flex items-center">
												Comisión Wompi Base (3.5%)
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'wompi' ? null : 'wompi'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'wompi'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 dark:bg-slate-800 text-[9px] leading-normal text-slate-200 dark:text-white rounded-lg shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															Comisión básica cobrada por Wompi por el procesamiento de transacciones con tarjeta.
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
											<span class="font-bold text-red-500 dark:text-red-405 font-mono">-${wompiCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between items-center">
											<span class="text-slate-500 dark:text-slate-400 flex items-center">
												IVA sobre Comisión (13%)
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'iva' ? null : 'iva'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'iva'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 dark:bg-slate-800 text-[9px] leading-normal text-slate-200 dark:text-white rounded-lg shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															IVA (13%) cobrado por Wompi sobre el valor de su comisión. Sirve como Crédito Fiscal acreditable para tu hotel.
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
											<span class="font-bold text-red-500 dark:text-red-405 font-mono">-${wompiCommissionIva.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between items-center border-b border-slate-100/30 pb-2">
											<span class="text-slate-500 dark:text-slate-400 flex items-center">
												Retención 2% IVA (Anticipo MH)
												<div class="relative inline-block ml-1.5 font-sans">
													<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
														onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'retencion' ? null : 'retencion'; }}>
														<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
													</button>
													{#if activeTooltip === 'retencion'}
														<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-900 dark:bg-slate-800 text-[9px] leading-normal text-slate-200 dark:text-white rounded-lg shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
															Retención de IVA obligatoria del 2% por compras con tarjeta. Se liquida a Hacienda en tu nombre y lo acreditas en tu declaración mensual.
															<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
														</div>
													{/if}
												</div>
											</span>
											<span class="font-bold text-red-500 dark:text-red-405 font-mono">-${ivaRetention2pct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between pt-2.5">
											<span class="text-slate-500 dark:text-slate-400">Recaudado Efectivo/Transf. (con Impuestos)</span>
											<span class="font-bold text-slate-900 dark:text-white font-mono">${nonCardAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
										<div class="flex justify-between border-t border-slate-200 dark:border-gray-700/60 pt-3 mt-1.5 font-bold text-slate-900 dark:text-white text-sm">
											<span>Efectivo Neto Estimado en Bancos</span>
											<span class="font-black text-emerald-500 dark:text-emerald-400 font-mono">${estimatedNetInBank.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- --- VISTA: REPORTE DE OCUPACIÓN DETALLADO --- -->
				{#if selectedTab === 'occupancy' && occupancyData}
					<div in:fade class="space-y-8">
						<!-- Sub-Header -->
						<div class="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md">
							<span class="text-sm font-bold text-[#D4AF37] uppercase tracking-wider pl-2">Reporte de Ocupación</span>
							<div class="flex gap-2.5">
								<button 
									onclick={handleExportCSV}
									class="px-4 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all border border-slate-200/50 dark:border-transparent"
								>
									<FileSpreadsheet class="w-4 h-4 text-[#D4AF37]" />
									Exportar CSV
								</button>
								<button 
									onclick={handleExportPDF}
									disabled={isExporting}
									class="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
								>
									{#if isExporting}
										<div class="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
									{:else}
										<FileText class="w-4 h-4" />
									{/if}
									Exportar PDF
								</button>
							</div>
						</div>

						<!-- KPIs Ocupación -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Porcentaje de Ocupación</span>
								<p class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">{occupancyData.occupancy_rate}%</p>
							</div>
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Noches Vendidas</span>
								<p class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">{occupancyData.total_nights_sold} noches</p>
							</div>
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Habitaciones Activas</span>
								<p class="text-xl font-bold text-[#D4AF37] font-['Outfit'] mt-1">{occupancyData.available_rooms_count} habs</p>
							</div>
						</div>

						<!-- Gráficos de Ocupación -->
						<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<!-- Tendencia de Ocupación -->
							<div class="lg:col-span-2 admin-kpi-card">
								<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">Tendencia Diaria de Habitaciones Ocupadas</h3>
								<ReportLineChart 
									data={occupancyData.occupancy_trend.map(o => ({ date: o.date, value1: o.occupied_rooms }))}
									label1="Habs Ocupadas"
									color1="#D4AF37"
									height={240}
									isCurrency={false}
								/>
							</div>

							<!-- Ocupación por Tipo de Habitación -->
							<div class="admin-kpi-card">
								<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">Ocupación por Tipo de Habitación</h3>
								<ReportPieChart 
									data={occupancyData.room_type_occupancy.map(t => ({ label: t.room_type, value: t.occupied_nights }))}
									height={220}
									title="Noches"
									isCurrency={false}
								/>
							</div>
						</div>

						<!-- Tabla detallada de Ocupación por Habitación -->
						<div class="admin-kpi-card !p-0 !overflow-visible">
							<div class="p-5 border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/10 flex items-center justify-between !overflow-visible">
								<div class="flex items-center gap-1.5">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Rendimiento Detallado de Habitaciones</h3>
									<div class="relative inline-block font-sans normal-case">
										<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
											onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'tbl_room_prop' ? null : 'tbl_room_prop'; }}>
											<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
										</button>
										{#if activeTooltip === 'tbl_room_prop'}
											<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium" transition:fade>
												<p class="font-bold text-[#D4AF37] mb-1">Rendimiento de Habitaciones (Bruto)</p>
												<p>Los ingresos en esta tabla representan la porción de ingresos de hospedaje correspondientes a las noches ocupadas en el período. Los valores son <strong>brutos</strong> e incluyen el 13% de IVA y el 5% de Turismo (18% total).</p>
												<div class="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
											</div>
										{/if}
									</div>
								</div>
							</div>
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs border-collapse">
									<thead>
										<tr class="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20">
											<th class="p-4 font-bold">Número de Hab.</th>
											<th class="p-4 font-bold">Tipo</th>
											<th class="p-4 font-bold text-center">Noches Ocupadas</th>
											<th class="p-4 font-bold text-center">Porcentaje Ocupación</th>
											<th class="p-4 font-bold text-right">Ingresos Proporcionales (Bruto)</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
										{#each occupancyData.room_occupancy as item}
											<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
												<td class="p-4 font-bold text-slate-800 dark:text-white">{item.room_number}</td>
												<td class="p-4 text-slate-500 dark:text-slate-400">{item.room_type}</td>
												<td class="p-4 text-center font-bold">{item.occupied_nights}</td>
												<td class="p-4 text-center">
													<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D4AF37]/10 text-[#D4AF37]">
														{item.occupancy_pct}%
													</span>
												</td>
												<td class="p-4 text-right font-semibold text-emerald-400">
													${item.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				{/if}

				<!-- --- VISTA: REPORTE DE CLIENTES DETALLADO --- -->
				{#if selectedTab === 'customers' && customerData}
					<div in:fade class="space-y-8">
						<!-- Sub-Header -->
						<div class="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md !overflow-visible">
							<div class="flex items-center gap-1.5 pl-2">
								<span class="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">Reporte Analítico de Clientes</span>
								<div class="relative inline-block font-sans normal-case">
									<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
										onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'tbl_cust_bruto' ? null : 'tbl_cust_bruto'; }}>
										<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
									</button>
									{#if activeTooltip === 'tbl_cust_bruto'}
										<div class="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium font-sans" transition:fade>
											<p class="font-bold text-[#D4AF37] mb-1">Métricas de Clientes (Bruto)</p>
											<p>Todos los montos financieros en esta sección representan la <strong>inversión bruta</strong> de los huéspedes (pagos totales realizados, incluyendo tarifa base de habitación, servicios extras, cargos incidentales e impuestos aplicables).</p>
											<div class="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
										</div>
									{/if}
								</div>
							</div>
							<div class="flex gap-2.5">
								<button 
									onclick={handleExportCSV}
									class="px-4 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all border border-slate-200/50 dark:border-transparent"
								>
									<FileSpreadsheet class="w-4 h-4 text-[#D4AF37]" />
									Exportar CSV
								</button>
								<button 
									onclick={handleExportPDF}
									disabled={isExporting}
									class="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
								>
									{#if isExporting}
										<div class="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
									{:else}
										<FileText class="w-4 h-4" />
									{/if}
									Exportar PDF
								</button>
							</div>
						</div>

						<!-- KPIs Clientes -->
						<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Huéspedes Activos</span>
								<p class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">{customerData.total_customers}</p>
							</div>
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Nuevos Perfiles</span>
								<p class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">{customerData.new_customers}</p>
							</div>
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Tasa de Recurrencia</span>
								<p class="text-xl font-bold text-[#D4AF37] font-['Outfit'] mt-1">{customerData.returning_customers_pct}%</p>
							</div>
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Gasto Medio ({customerViewMode === 'net' ? 'Neto' : 'Bruto'})</span>
								<p class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
									${(customerViewMode === 'net' ? (customerData.avg_spent_per_customer / 1.18) : customerData.avg_spent_per_customer).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</p>
							</div>
						</div>

						<!-- Clientes por Procedencia (País) y Top Clientes -->
						<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<!-- Top Clientes por Gasto -->
							<div class="lg:col-span-2 admin-kpi-card">
								<div class="flex justify-between items-center mb-6">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Top Huéspedes por Nivel de Gasto</h3>
									<!-- Toggle Neto / Bruto -->
									<div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-750 shrink-0">
										<button 
											type="button" 
											onclick={() => customerViewMode = 'net'} 
											class="px-2 py-1 rounded-md transition-all {customerViewMode === 'net' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Neto
										</button>
										<button 
											type="button" 
											onclick={() => customerViewMode = 'gross'} 
											class="px-2 py-1 rounded-md transition-all {customerViewMode === 'gross' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Bruto
										</button>
									</div>
								</div>
								<ReportBarChart 
									data={customerData.top_customers.map(c => ({ 
										label: c.name, 
										value: customerViewMode === 'net' ? Number((c.total_spent / 1.18).toFixed(2)) : c.total_spent 
									}))}
									layout="horizontal"
									height={280}
								/>
							</div>

							<!-- Procedencia Demográfica -->
							<div class="admin-kpi-card">
								<div class="flex justify-between items-center mb-6">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Procedencia de Huéspedes</h3>
									<!-- Toggle Neto / Bruto -->
									<div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-750 shrink-0">
										<button 
											type="button" 
											onclick={() => customerViewMode = 'net'} 
											class="px-2 py-1 rounded-md transition-all {customerViewMode === 'net' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Neto
										</button>
										<button 
											type="button" 
											onclick={() => customerViewMode = 'gross'} 
											class="px-2 py-1 rounded-md transition-all {customerViewMode === 'gross' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Bruto
										</button>
									</div>
								</div>
								<ReportPieChart 
									data={customerData.customer_countries.map(c => ({ 
										label: c.country, 
										value: customerViewMode === 'net' ? Number((c.total_spent / 1.18).toFixed(2)) : c.total_spent 
									}))}
									height={220}
									title="Pernoctación"
								/>
							</div>
						</div>

						<!-- Tabla de Clientes Top -->
						<div class="admin-kpi-card !p-0">
							<div class="p-5 border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/10 flex items-center justify-between">
								<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Detalle Completo de Top Huéspedes</h3>
							</div>
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs border-collapse">
									<thead>
										<tr class="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20">
											<th class="p-4 font-bold">Huésped</th>
											<th class="p-4 font-bold">Email</th>
											<th class="p-4 font-bold text-center">Reservaciones</th>
											<th class="p-4 font-bold text-right">Inversión Total ({customerViewMode === 'net' ? 'Neto' : 'Bruto'})</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
										{#each customerData.top_customers as item}
											<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
												<td class="p-4 font-bold text-slate-800 dark:text-white">{item.name}</td>
												<td class="p-4 text-slate-500 dark:text-slate-400">{item.email}</td>
												<td class="p-4 text-center font-bold">{item.reservations_count}</td>
												<td class="p-4 text-right font-semibold text-emerald-400">
													${(customerViewMode === 'net' ? (item.total_spent / 1.18) : item.total_spent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				{/if}

				<!-- --- VISTA: REPORTE DE EXTRAS/SERVICIOS DETALLADO --- -->
				{#if selectedTab === 'extras' && extrasData}
					<div in:fade class="space-y-8">
						<!-- Sub-Header -->
						<div class="flex items-center justify-between bg-white/40 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm backdrop-blur-md !overflow-visible">
							<div class="flex items-center gap-1.5 pl-2">
								<span class="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">Reporte de Servicios y Extras</span>
								<div class="relative inline-block font-sans normal-case">
									<button type="button" class="cursor-pointer text-slate-400 hover:text-[#D4AF37] transition-colors p-0.5 focus:outline-none align-middle" 
										onclick={(e) => { e.stopPropagation(); activeTooltip = activeTooltip === 'tbl_extras_bruto' ? null : 'tbl_extras_bruto'; }}>
										<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline shrink-0"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
									</button>
									{#if activeTooltip === 'tbl_extras_bruto'}
										<div class="absolute bottom-full left-0 mb-2 w-64 p-3 bg-slate-900 dark:bg-slate-800 text-[10px] leading-relaxed text-slate-200 dark:text-white rounded-xl shadow-xl border border-slate-700/50 z-50 text-center font-medium font-sans" transition:fade>
											<p class="font-bold text-[#D4AF37] mb-1">Métricas de Servicios y Extras</p>
											<p>Por defecto, este reporte se muestra en <strong>Neto</strong> (base imponible registrada en el catálogo). Al cambiar a <strong>Bruto</strong>, se le suma automáticamente el 13% de IVA aplicable a todos los servicios y amenidades.</p>
											<div class="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
										</div>
									{/if}
								</div>
							</div>
							<div class="flex gap-2.5">
								<button 
									onclick={handleExportCSV}
									class="px-4 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-750 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all border border-slate-200/50 dark:border-transparent"
								>
									<FileSpreadsheet class="w-4 h-4 text-[#D4AF37]" />
									Exportar CSV
								</button>
								<button 
									onclick={handleExportPDF}
									disabled={isExporting}
									class="px-4 py-2.5 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-slate-950 text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
								>
									{#if isExporting}
										<div class="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
									{:else}
										<FileText class="w-4 h-4" />
									{/if}
									Exportar PDF
								</button>
							</div>
						</div>

						<!-- KPIs Extras -->
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Ingresos por Amenidades ({extrasViewMode === 'net' ? 'Neto' : 'Bruto'})</span>
								<p class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">
									${(extrasViewMode === 'net' ? extrasData.total_extra_revenue : extrasData.total_extra_revenue * 1.13).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
								</p>
							</div>
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Servicios Contratados</span>
								<p class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] mt-1">{extrasData.total_extras_sold} unidades</p>
							</div>
							<div class="admin-kpi-card !p-5">
								<span class="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-500 tracking-wider">Gasto Extra Promedio ({extrasViewMode === 'net' ? 'Neto' : 'Bruto'})</span>
								<p class="text-xl font-bold text-[#D4AF37] font-['Outfit'] mt-1">
									${(extrasViewMode === 'net' ? extrasData.avg_extra_spent_per_res : extrasData.avg_extra_spent_per_res * 1.13).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por reserva
								</p>
							</div>
						</div>

						<!-- Gráficos de Extras -->
						<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
							<!-- Top Extras más vendidos -->
							<div class="lg:col-span-2 admin-kpi-card">
								<div class="flex justify-between items-center mb-6">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Amenidades Extras más Demandadas ($)</h3>
									<!-- Toggle Neto / Bruto -->
									<div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-750 shrink-0">
										<button 
											type="button" 
											onclick={() => extrasViewMode = 'net'} 
											class="px-2 py-1 rounded-md transition-all {extrasViewMode === 'net' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Neto
										</button>
										<button 
											type="button" 
											onclick={() => extrasViewMode = 'gross'} 
											class="px-2 py-1 rounded-md transition-all {extrasViewMode === 'gross' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Bruto
										</button>
									</div>
								</div>
								<ReportBarChart 
									data={extrasData.top_extras.map(e => ({ 
										label: e.name, 
										value: extrasViewMode === 'net' ? e.revenue : Number((e.revenue * 1.13).toFixed(2)) 
									}))}
									layout="horizontal"
									height={280}
								/>
							</div>

							<!-- Distribución por Categoría -->
							<div class="admin-kpi-card">
								<div class="flex justify-between items-center mb-6">
									<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Distribución por Categorías</h3>
									<!-- Toggle Neto / Bruto -->
									<div class="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-slate-200/50 dark:border-slate-750 shrink-0">
										<button 
											type="button" 
											onclick={() => extrasViewMode = 'net'} 
											class="px-2 py-1 rounded-md transition-all {extrasViewMode === 'net' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Neto
										</button>
										<button 
											type="button" 
											onclick={() => extrasViewMode = 'gross'} 
											class="px-2 py-1 rounded-md transition-all {extrasViewMode === 'gross' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'}"
										>
											Bruto
										</button>
									</div>
								</div>
								<ReportPieChart 
									data={extrasData.category_distribution.map(c => ({ 
										label: c.category, 
										value: extrasViewMode === 'net' ? c.revenue : Number((c.revenue * 1.13).toFixed(2)) 
									}))}
									height={220}
									title="Categorías"
								/>
							</div>
						</div>

						<!-- Tabla detallada de Servicios -->
						<div class="admin-kpi-card !p-0">
							<div class="p-5 border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/10 flex items-center justify-between">
								<h3 class="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Detalle de Contrataciones Maestras</h3>
							</div>
							<div class="overflow-x-auto">
								<table class="w-full text-left text-xs border-collapse">
									<thead>
										<tr class="border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20">
											<th class="p-4 font-bold">Servicio / Extra</th>
											<th class="p-4 font-bold">Categoría</th>
											<th class="p-4 font-bold text-center">Unidades Consumidas</th>
											<th class="p-4 font-bold text-right">Monto Total Recaudado ({extrasViewMode === 'net' ? 'Neto' : 'Bruto'})</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
										{#each extrasData.top_extras as item}
											<tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
												<td class="p-4 font-bold text-slate-800 dark:text-white">{item.name}</td>
												<td class="p-4 text-slate-500 dark:text-slate-400">{item.category}</td>
												<td class="p-4 text-center font-bold">{item.quantity_sold}</td>
												<td class="p-4 text-right font-semibold text-emerald-400">
													${(extrasViewMode === 'net' ? item.revenue : item.revenue * 1.13).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
	</div>
</div>

<style>
	.admin-content-grid {
		max-width: 1400px;
		margin: 0 auto;
	}

	.fade-in {
		animation: fadeIn 0.5s ease-out forwards;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* Estilos de impresión PDF dedicados */
	.hidden-on-screen {
		display: none;
	}

	:global(.pdf-printing) {
		background-color: #0B0E14 !important;
		color: #ffffff !important;
		padding: 20px !important;
	}

	:global(.pdf-printing) .hidden-on-screen {
		display: block !important;
	}

	:global(.pdf-printing) button,
	:global(.pdf-printing) .flex-wrap {
		display: none !important; /* Quita selectores interactivos del PDF final */
	}

	:global(.pdf-printing) .grid {
		display: grid !important;
	}

	:global(.pdf-printing) th,
	:global(.pdf-printing) td {
		border-color: #2D3748 !important;
	}
</style>
