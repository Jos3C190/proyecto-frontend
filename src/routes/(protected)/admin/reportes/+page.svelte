<script lang="ts">
	import { fade, slide, fly } from 'svelte/transition';
	import { 
		TrendingUp, BarChart3, PieChart, FileText, Download, 
		Calendar, Filter, DollarSign, Users, BedDouble, 
		Activity, ChevronDown, FileSpreadsheet, ExternalLink,
		CalendarDays, ArrowUpRight, ArrowDownRight,
		Clock, MapPin, Star
	} from 'lucide-svelte';
	import '../../admin/adminPage.css';

	let selectedRange = $state('Este Mes');
	let isExporting = $state(false);

	const ranges = ['Hoy', 'Esta Semana', 'Este Mes', 'Último Trimestre', 'Año Actual'];

	const reportCategories = [
		{
			id: 'financial',
			title: 'Finanzas y Rentabilidad',
			desc: 'Ingresos, impuestos y métodos de pago.',
			icon: DollarSign,
			color: 'text-emerald-500',
			bg: 'bg-emerald-500/10',
			stats: '$45,280.00'
		},
		{
			id: 'occupancy',
			title: 'Ocupación y Logística',
			desc: 'Entradas, salidas y estado de habitaciones.',
			icon: BedDouble,
			color: 'text-[#D4AF37]',
			bg: 'bg-[#D4AF37]/10',
			stats: '84%'
		},
		{
			id: 'customers',
			title: 'Análisis de Clientes',
			desc: 'Demografía, lealtad y satisfacción.',
			icon: Users,
			color: 'text-blue-500',
			bg: 'bg-blue-500/10',
			stats: '1,240 h'
		},
		{
			id: 'inventory',
			title: 'Inventario y Amenidades',
			desc: 'Consumo de recursos y stock.',
			icon: Activity,
			color: 'text-purple-500',
			bg: 'bg-purple-500/10',
			stats: 'Lo-Stock (2)'
		}
	];

	async function handleExport(type: 'pdf' | 'csv') {
		isExporting = true;
		// Simulación de generación de reporte
		await new Promise(resolve => setTimeout(resolve, 1500));
		isExporting = false;
	}
</script>

<div class="admin-page fade-in">
	<!-- Header -->
	<div class="admin-header-container">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
			<div>
				<h1 class="admin-title">Inteligencia de Negocio</h1>
				<p class="admin-desc">Generación de reportes avanzados y análisis de rendimiento del resort.</p>
			</div>

			<div class="flex items-center gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-x-auto no-scrollbar">
				{#each ranges as range}
					<button 
						onclick={() => selectedRange = range}
						class="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap {selectedRange === range ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}"
					>
						{range}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="admin-content-grid space-y-8">
		<!-- KPI Dashboard Section -->
		<section>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<!-- Card 1: Revenue -->
				<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
					<div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
					<div class="flex items-center justify-between mb-4">
						<div class="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
							<DollarSign class="w-5 h-5" />
						</div>
						<span class="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
							<ArrowUpRight class="w-3 h-3" />
							+12.4%
						</span>
					</div>
					<h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ingresos Netos</h3>
					<p class="text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">$45,280.00</p>
					
					<!-- Mini Chart Simulation -->
					<div class="mt-6 h-10 flex items-end gap-1">
						{#each [40, 60, 45, 70, 50, 85, 90] as height}
							<div class="flex-1 bg-emerald-500/20 rounded-t-sm group-hover:bg-emerald-500/40 transition-all" style="height: {height}%"></div>
						{/each}
					</div>
				</div>

				<!-- Card 2: Occupancy -->
				<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
					<div class="absolute -right-4 -top-4 w-24 h-24 bg-[#D4AF37]/5 rounded-full blur-2xl group-hover:bg-[#D4AF37]/10 transition-colors"></div>
					<div class="flex items-center justify-between mb-4">
						<div class="p-2 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37]">
							<PieChart class="w-5 h-5" />
						</div>
						<span class="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-1 rounded-full">
							<ArrowUpRight class="w-3 h-3" />
							+4.2%
						</span>
					</div>
					<h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ocupación Media</h3>
					<p class="text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">84.5%</p>
					
					<div class="mt-6 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
						<div class="h-full bg-[#D4AF37] rounded-full shadow-[0_0_10px_rgba(212,175,55,0.4)]" style="width: 84.5%"></div>
					</div>
				</div>

				<!-- Card 3: ADR -->
				<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
					<div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors"></div>
					<div class="flex items-center justify-between mb-4">
						<div class="p-2 bg-blue-500/10 rounded-xl text-blue-500">
							<TrendingUp class="w-5 h-5" />
						</div>
						<span class="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-full">
							Estable
						</span>
					</div>
					<h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Tarifa Promedio (ADR)</h3>
					<p class="text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">$185.00</p>
					
					<div class="mt-6 flex items-center gap-2 text-xs text-gray-500 font-medium">
						<Clock class="w-3 h-3" />
						Siguiente revisión: Mañana
					</div>
				</div>

				<!-- Card 4: Satisfaction -->
				<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
					<div class="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors"></div>
					<div class="flex items-center justify-between mb-4">
						<div class="p-2 bg-purple-500/10 rounded-xl text-purple-500">
							<Star class="w-5 h-5" />
						</div>
						<span class="flex items-center gap-1 text-[10px] font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-full">
							Excelente
						</span>
					</div>
					<h3 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Índice Satisfacción</h3>
					<p class="text-2xl font-bold text-slate-900 dark:text-white font-['Outfit']">4.9/5.0</p>
					
					<div class="mt-6 flex gap-1">
						{#each Array(5) as _, i}
							<Star class="w-4 h-4 {i < 4 ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-gray-300 dark:text-gray-700'}" />
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- Report Generation Bento Grid -->
		<section>
			<div class="flex items-center gap-3 mb-6">
				<div class="p-2 bg-[#D4AF37]/10 rounded-lg text-[#D4AF37]">
					<Activity class="w-5 h-5" />
				</div>
				<h2 class="text-xl font-bold text-slate-900 dark:text-white font-['Outfit'] tracking-tight">Catálogo de Reportes</h2>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Main Reports Column (Bento) -->
				<div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each reportCategories as report, i}
						<div 
							class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:border-[#D4AF37]/50 transition-all group flex flex-col justify-between min-h-[180px]"
							in:fly={{ y: 20, delay: i * 100 }}
						>
							<div>
								<div class="flex items-center justify-between mb-3">
									<div class="p-2.5 {report.bg} {report.color} rounded-2xl">
										<report.icon class="w-6 h-6" />
									</div>
									<span class="text-xs font-bold text-gray-300 dark:text-gray-700 group-hover:text-[#D4AF37] transition-colors uppercase tracking-widest">Auto-Gen</span>
								</div>
								<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-1">{report.title}</h3>
								<p class="text-xs text-gray-500 line-clamp-1">{report.desc}</p>
							</div>

							<div class="flex items-center justify-between mt-4">
								<div class="text-lg font-bold {report.color} font-['Outfit']">
									{report.stats}
								</div>
								<div class="flex gap-2">
									<button 
										onclick={() => handleExport('csv')}
										class="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
										title="Exportar CSV"
									>
										<FileSpreadsheet class="w-5 h-5" />
									</button>
									<button 
										onclick={() => handleExport('pdf')}
										class="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
										title="Exportar PDF"
									>
										<FileText class="w-5 h-5" />
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Export Center (Sidebar styled) -->
				<div class="bg-[#1a1a1a] dark:bg-[#D4AF37]/10 rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[400px]">
					<div class="absolute top-0 right-0 p-8 opacity-10">
						<Download class="w-32 h-32" />
					</div>
					
					<div>
						<h2 class="text-2xl font-bold font-['Outfit'] mb-2">Exportación</h2>
						<p class="text-gray-400 text-sm mb-8 leading-relaxed">
							Consolida todos los datos del rango seleccionado ({selectedRange}) en un solo documento.
						</p>

						<div class="space-y-4">
							<button 
								onclick={() => handleExport('pdf')}
								disabled={isExporting}
								class="w-full py-4 bg-[#D4AF37] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#D4AF37]/20 disabled:opacity-50"
							>
								{#if isExporting}
									<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
								{:else}
									<FileText class="w-5 h-5" />
								{/if}
								Informe PDF
							</button>

							<button 
								onclick={() => handleExport('csv')}
								disabled={isExporting}
								class="w-full py-4 bg-white/10 text-white border border-white/10 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-white/20 transition-all disabled:opacity-50"
							>
								<Download class="w-5 h-5" />
								Datos CSV
							</button>
						</div>
					</div>

					<div class="mt-8 pt-8 border-t border-white/5 flex items-center gap-3 text-xs text-gray-400">
						<div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
						Generador en línea
					</div>
				</div>
			</div>
		</section>

		<!-- Recent Exports (Mock list) -->
		<section>
			<div class="bg-white dark:bg-[#11151d] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
				<div class="p-6 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
					<h3 class="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Últimas Descargas</h3>
					<Activity class="w-4 h-4 text-gray-400" />
				</div>
				<div class="divide-y divide-gray-50 dark:divide-gray-800">
					{#each [1, 2, 3] as i}
						<div class="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
							<div class="flex items-center gap-4">
								<div class="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-400">
									<FileText class="w-4 h-4" />
								</div>
								<div>
									<p class="text-sm font-bold text-slate-900 dark:text-white">Reporte_Mensual_{i}.pdf</p>
									<p class="text-[10px] text-gray-500">Hace {i * 2} horas • 2.4 MB</p>
								</div>
							</div>
							<button class="text-[#D4AF37] hover:underline text-xs font-bold flex items-center gap-1">
								Ver
								<ExternalLink class="w-3 h-3" />
							</button>
						</div>
					{/each}
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.admin-content-grid {
		max-width: 1400px;
		margin: 0 auto;
	}

	.fade-in {
		animation: fadeIn 0.6s ease-out forwards;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
