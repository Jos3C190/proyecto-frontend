<script lang="ts">
	interface DataItem {
		label: string;
		value: number;
		percentage?: number;
	}

	interface Props {
		data: DataItem[];
		height?: number;
		title?: string;
	}

	let { data = [], height = 250, title = '' }: Props = $props();

	let activeIndex = $state<number | null>(null);

	// Palette of premium colors matching the gold theme
	const colors = [
		'#D4AF37', // Gold
		'#B87333', // Copper
		'#2E7D32', // Deep green
		'#1565C0', // Cobalt blue
		'#6A1B9A', // Imperial purple
		'#AD1457', // Ruby pink
		'#EF6C00'  // Amber orange
	];

	let total = $derived(data.reduce((acc, d) => acc + d.value, 0));

	// Calculate slices geometry
	let slices = $derived.by(() => {
		if (total === 0) return [];
		
		let cumulativeAngle = 0;
		const r = 80; // Outer radius
		const ir = 50; // Inner radius (donut cut)
		const cx = 100;
		const cy = 100;

		return data.map((d, i) => {
			const pct = d.value / total;
			const angle = pct * 360;
			
			// Angles in radians
			const a1 = (cumulativeAngle - 90) * Math.PI / 180;
			const a2 = (cumulativeAngle + angle - 90) * Math.PI / 180;
			
			cumulativeAngle += angle;

			// Coordinates for outer circle
			const x1 = cx + r * Math.cos(a1);
			const y1 = cy + r * Math.sin(a1);
			const x2 = cx + r * Math.cos(a2);
			const y2 = cy + r * Math.sin(a2);

			// Coordinates for inner circle
			const ix1 = cx + ir * Math.cos(a1);
			const iy1 = cy + ir * Math.sin(a1);
			const ix2 = cx + ir * Math.cos(a2);
			const iy2 = cy + ir * Math.sin(a2);

			// Large arc flag
			const largeArcFlag = angle > 180 ? 1 : 0;

			// Path description for donut slice
			// Move to outer start, draw outer arc to end, line to inner end, draw inner arc back to start, close path
			const pathData = pct >= 0.999
				? `M ${cx} ${cy - r} 
				   A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} 
				   Z 
				   M ${cx} ${cy - ir} 
				   A ${ir} ${ir} 0 1 0 ${cx - 0.01} ${cy - ir} 
				   Z`
				: `M ${x1} ${y1} 
				   A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} 
				   L ${ix2} ${iy2} 
				   A ${ir} ${ir} 0 ${largeArcFlag} 0 ${ix1} ${iy1} 
				   Z`;

			return {
				data: d,
				path: pathData,
				color: colors[i % colors.length],
				percentage: pct * 100,
				index: i
			};
		});
	});

	let hoveredSlice = $derived(activeIndex !== null ? slices[activeIndex] : null);
</script>

<div class="pie-chart-container flex flex-col md:flex-row items-center gap-6 justify-center" style="min-height: {height}px;">
	{#if total > 0}
		<!-- SVG Donut Chart -->
		<div class="relative w-[200px] h-[200px] shrink-0">
			<svg width="200" height="200" viewBox="0 0 200 200">
				{#each slices as slice}
					<!-- Donut Path with clean transition -->
					<path
						d={slice.path}
						fill={slice.color}
						class="slice-path transition-all duration-300 cursor-pointer origin-center"
						style="transform: {activeIndex === slice.index ? 'scale(1.05)' : 'scale(1)'};"
						opacity={activeIndex === null || activeIndex === slice.index ? 1 : 0.6}
						onmouseenter={() => activeIndex = slice.index}
						onmouseleave={() => activeIndex = null}
						role="button"
						aria-label={slice.data.label}
					/>
				{/each}
			</svg>

			<!-- Premium Center Text Overlay -->
			<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-10">
				{#if hoveredSlice}
					<span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
						{hoveredSlice.data.label.substring(0, 12)}
					</span>
					<span class="text-base font-extrabold text-white mt-0.5">
						${hoveredSlice.data.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
					</span>
					<span class="text-[9px] font-semibold text-[#D4AF37] mt-0.5">
						{hoveredSlice.percentage.toFixed(1)}%
					</span>
				{:else}
					<span class="text-[9px] font-bold uppercase tracking-widest text-slate-400">
						{title || 'Total'}
					</span>
					<span class="text-lg font-extrabold text-[#D4AF37] mt-0.5">
						${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
					</span>
					<span class="text-[8px] font-medium text-slate-500">
						{data.length} ítems
					</span>
				{/if}
			</div>
		</div>

		<!-- Legends Grid -->
		<div class="flex flex-col gap-2.5 w-full max-w-[240px]">
			{#each slices as slice}
				<button
					class="flex items-center justify-between text-left p-1.5 rounded-lg border border-transparent transition-all duration-200 hover:border-slate-800 hover:bg-slate-900/40 w-full"
					onmouseenter={() => activeIndex = slice.index}
					onmouseleave={() => activeIndex = null}
				>
					<div class="flex items-center gap-2">
						<!-- Color pill -->
						<span class="w-3 h-3 rounded-full shrink-0" style="background-color: {slice.color};"></span>
						<span class="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
							{slice.data.label}
						</span>
					</div>
					<div class="text-right shrink-0">
						<span class="text-xs font-bold text-slate-900 dark:text-white block">
							${slice.data.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
						</span>
						<span class="text-[10px] text-slate-400 font-medium block mt-0.5">
							{slice.percentage.toFixed(1)}%
						</span>
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<div class="flex items-center justify-center w-full min-h-[200px] text-sm text-slate-500">
			Sin datos para mostrar
		</div>
	{/if}
</div>

<style>
	@reference "../../../routes/layout.css";
	.pie-chart-container {
		@apply w-full select-none overflow-visible;
	}
	.slice-path {
		transform-origin: 100px 100px;
	}
</style>
