<script lang="ts">
	interface DataItem {
		date: string;
		value1: number; // Habitaciones
		value2?: number; // Extras
	}

	interface Props {
		data: DataItem[];
		height?: number;
		label1?: string;
		label2?: string;
		color1?: string;
		color2?: string;
	}

	let {
		data = [],
		height = 250,
		label1 = 'Habitaciones',
		label2 = 'Extras',
		color1 = '#D4AF37', // Gold
		color2 = '#B87333'  // Copper
	}: Props = $props();

	let width = $state(0);
	let padding = { top: 25, right: 20, bottom: 25, left: 20 };

	// Find the maximum value across both metrics for scale
	let maxVal = $derived(
		Math.max(
			...data.map(d => Math.max(d.value1, d.value2 ?? 0)),
			100
		)
	);

	// Compute point coordinates
	let points = $derived(
		data.map((d, i) => {
			const x = (i / Math.max(data.length - 1, 1)) * (width - padding.left - padding.right) + padding.left;
			const y1 = height - ((d.value1 / maxVal) * (height - padding.top - padding.bottom) + padding.bottom);
			const y2 = d.value2 !== undefined
				? height - ((d.value2 / maxVal) * (height - padding.top - padding.bottom) + padding.bottom)
				: null;

			return { x, y1, y2, data: d };
		})
	);

	// Build SVG path strings
	let path1 = $derived(
		points.length > 0
			? `M ${points[0].x} ${points[0].y1} ` + points.slice(1).map(p => `L ${p.x} ${p.y1}`).join(' ')
			: ''
	);

	let path2 = $derived(
		points.length > 0 && points[0].y2 !== null
			? `M ${points[0].x} ${points[0].y2} ` + points.slice(1).map(p => `L ${p.x} ${p.y2!}`).join(' ')
			: ''
	);

	// Area path strings for elegant gradients
	let area1 = $derived(
		points.length > 0
			? `${path1} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
			: ''
	);

	let area2 = $derived(
		points.length > 0 && points[0].y2 !== null
			? `${path2} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`
			: ''
	);

	// Interactive Tooltip State
	let activeIndex = $state<number | null>(null);
	let tooltipPos = $derived(activeIndex !== null && points.length > 0 ? points[activeIndex] : null);

	function handleMouseMove(e: MouseEvent) {
		if (!width || data.length === 0) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = e.clientX - rect.left;
		
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
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
	}
</script>

<div class="line-chart-container" bind:clientWidth={width} onmousemove={handleMouseMove} onmouseleave={handleMouseLeave} role="img">
	{#if width > 0 && data.length > 0}
		<svg {height} width={width || 500}>
			<defs>
				<!-- Gradient Area 1 -->
				<linearGradient id="gradient-line-1" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={color1} stop-opacity="0.2" />
					<stop offset="100%" stop-color={color1} stop-opacity="0" />
				</linearGradient>
				<!-- Gradient Area 2 -->
				<linearGradient id="gradient-line-2" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={color2} stop-opacity="0.15" />
					<stop offset="100%" stop-color={color2} stop-opacity="0" />
				</linearGradient>
			</defs>

			<!-- Bottom Baseline Grid -->
			<line
				x1={padding.left}
				y1={height - padding.bottom}
				x2={width - padding.right}
				y2={height - padding.bottom}
				stroke="currentColor"
				class="grid-line"
			/>

			<!-- Area 1 (Room Revenue) -->
			{#if area1}
				<path d={area1} fill="url(#gradient-line-1)" />
			{/if}

			<!-- Area 2 (Extras Revenue) -->
			{#if area2}
				<path d={area2} fill="url(#gradient-line-2)" />
			{/if}

			<!-- Line 1 -->
			{#if path1}
				<path d={path1} fill="none" stroke={color1} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
			{/if}

			<!-- Line 2 -->
			{#if path2}
				<path d={path2} fill="none" stroke={color2} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
			{/if}

			<!-- Hover vertical lines and nodes -->
			{#if tooltipPos}
				<!-- Vertical Dotted Indicator -->
				<line
					x1={tooltipPos.x}
					y1={padding.top}
					x2={tooltipPos.x}
					y2={height - padding.bottom}
					stroke="currentColor"
					class="hover-indicator"
					stroke-dasharray="3 3"
				/>

				<!-- Circle Node 1 -->
				<circle cx={tooltipPos.x} cy={tooltipPos.y1} r="4.5" fill="white" stroke={color1} stroke-width="2" />

				<!-- Circle Node 2 -->
				{#if tooltipPos.y2 !== null}
					<circle cx={tooltipPos.x} cy={tooltipPos.y2} r="4" fill="white" stroke={color2} stroke-width="2" />
				{/if}
			{/if}
		</svg>
	{:else}
		<div class="flex items-center justify-center h-full text-sm text-slate-500">
			Sin datos en el período seleccionado
		</div>
	{/if}

	<!-- Custom Premium Floating Tooltip -->
	{#if tooltipPos}
		<div class="chart-tooltip" style="left: {tooltipPos.x}px; top: {Math.min(tooltipPos.y1, tooltipPos.y2 ?? 9999) - 15}px;">
			<span class="tooltip-date block">{formatDate(tooltipPos.data.date)}</span>
			
			<div class="flex flex-col gap-1 mt-1.5 min-w-[120px]">
				<!-- Value 1 -->
				<div class="flex items-center justify-between gap-3 text-xs">
					<div class="flex items-center gap-1.5 text-slate-400">
						<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {color1};"></span>
						<span>{label1}:</span>
					</div>
					<span class="font-extrabold text-white">
						${tooltipPos.data.value1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</span>
				</div>

				<!-- Value 2 -->
				{#if tooltipPos.data.value2 !== undefined}
					<div class="flex items-center justify-between gap-3 text-xs">
						<div class="flex items-center gap-1.5 text-slate-400">
							<span class="w-2 h-2 rounded-full shrink-0" style="background-color: {color2};"></span>
							<span>{label2}:</span>
						</div>
						<span class="font-extrabold text-white">
							${tooltipPos.data.value2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	@reference "../../../routes/layout.css";
	.line-chart-container {
		@apply relative w-full cursor-crosshair select-none overflow-visible;
	}

	.grid-line {
		@apply text-slate-100 dark:text-slate-800;
	}

	.hover-indicator {
		@apply text-slate-300 dark:text-slate-600;
	}

	.chart-tooltip {
		@apply pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col items-start rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90;
		box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
	}

	.tooltip-date {
		@apply text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400;
		font-family: 'Outfit', sans-serif;
	}
</style>
