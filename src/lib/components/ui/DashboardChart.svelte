<script lang="ts">
	interface DataItem {
		date: string;
		amount: number;
		type?: 'actual' | 'forecast';
	}

	interface Props {
		data: DataItem[];
		height?: number;
		color?: string;
	}

	let { data, height = 200, color = '#D4AF37' }: Props = $props();

	// Dimensions
	let width = $state(0);
	let padding = { top: 20, right: 10, bottom: 20, left: 10 };

	// Derived scales
	let maxVal = $derived(Math.max(...data.map(d => d.amount), 10));
	let points = $derived(data.map((d, i) => ({
		x: (i / (data.length - 1)) * (width - padding.left - padding.right) + padding.left,
		y: height - ((d.amount / maxVal) * (height - padding.top - padding.bottom) + padding.bottom),
		data: d
	})));

	let actualPoints = $derived(points.filter(p => p.data.type !== 'forecast'));
	let forecastPoints = $derived(points.filter(p => p.data.type === 'forecast'));
	
	// Add the last actual point to forecast to connect them
	let forecastPathPoints = $derived(forecastPoints.length > 0 ? [actualPoints[actualPoints.length - 1], ...forecastPoints] : []);

	let actualPath = $derived(actualPoints.length > 0 ? `M ${actualPoints[0].x} ${actualPoints[0].y} ` + actualPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') : '');
	let forecastPath = $derived(forecastPathPoints.length > 1 ? `M ${forecastPathPoints[0].x} ${forecastPathPoints[0].y} ` + forecastPathPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') : '');
	
	let areaData = $derived(actualPoints.length > 0 ? `${actualPath} L ${actualPoints[actualPoints.length - 1].x} ${height} L ${actualPoints[0].x} ${height} Z` : '');

	// Tooltip state
	let activeIndex = $state<number | null>(null);
	let tooltipPos = $derived(activeIndex !== null ? points[activeIndex] : null);

	function handleMouseMove(e: MouseEvent) {
		if (!width) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - rect.left;
		
		// Find closest point
		const relativeX = (x - padding.left) / (width - padding.left - padding.right);
		const index = Math.round(relativeX * (data.length - 1));
		
		if (index >= 0 && index < data.length) {
			activeIndex = index;
		} else {
			activeIndex = null;
		}
	}

	function handleMouseLeave() {
		activeIndex = null;
	}

	function formatDate(dateStr: string) {
		// Forzar interpretación local añadiendo T00:00:00 si es solo fecha
		const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
		return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
	}
</script>

<div class="chart-container" bind:clientWidth={width} onmousemove={handleMouseMove} onmouseleave={handleMouseLeave} role="img">
	<svg {height} width="100%">
		<!-- Area Gradient -->
		<defs>
			<linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color={color} stop-opacity="0.3" />
				<stop offset="100%" stop-color={color} stop-opacity="0" />
			</linearGradient>
		</defs>

		<!-- Grid Lines (Simplified) -->
		<line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="currentColor" class="grid-line" />
		
		{#if width > 0 && points.length > 0}
			<!-- Area -->
			<path d={areaData} fill="url(#chart-gradient)" />
			
			<!-- Actual Line -->
			<path d={actualPath} fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

			<!-- Forecast Line -->
			{#if forecastPath}
				<path d={forecastPath} fill="none" stroke={color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="6 4" opacity="0.6" />
			{/if}

			<!-- Hover Indicator -->
			{#if tooltipPos}
				<line x1={tooltipPos.x} y1={padding.top} x2={tooltipPos.x} y2={height - padding.bottom} stroke={color} stroke-width="1" stroke-dasharray="4 4" />
				<circle cx={tooltipPos.x} cy={tooltipPos.y} r="5" fill="white" stroke={color} stroke-width="2" />
			{/if}
		{/if}
	</svg>

	<!-- Tooltip -->
	{#if tooltipPos}
		<div class="chart-tooltip" style="left: {tooltipPos.x}px; top: {tooltipPos.y - 10}px;">
			<div class="flex items-center gap-1.5">
				<span class="tooltip-date">{formatDate(tooltipPos.data.date)}</span>
				{#if tooltipPos.data.type === 'forecast'}
					<span class="forecast-badge">Proyectado</span>
				{/if}
			</div>
			<span class="tooltip-value">${tooltipPos.data.amount.toLocaleString()}</span>
		</div>
	{/if}
</div>

<style>
	@reference "../../../routes/layout.css";
	.chart-container {
		@apply relative w-full cursor-crosshair select-none overflow-visible;
	}

	.grid-line {
		@apply text-slate-100 dark:text-slate-800;
	}

	.chart-tooltip {
		@apply pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/90;
	}

	.tooltip-date {
		@apply text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400;
	}

	.tooltip-value {
		@apply text-sm font-bold text-slate-900 dark:text-white;
	}

	.forecast-badge {
		@apply text-[8px] px-1 py-0.5 rounded bg-[#D4AF37] text-white font-bold uppercase;
	}
</style>
