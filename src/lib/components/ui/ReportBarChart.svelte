<script lang="ts">
	interface DataItem {
		label: string;
		value: number;
	}

	interface Props {
		data: DataItem[];
		height?: number;
		color?: string;
		layout?: 'horizontal' | 'vertical';
	}

	let { data = [], height = 250, color = '#D4AF37', layout = 'horizontal' }: Props = $props();

	let width = $state(0);
	let activeIndex = $state<number | null>(null);

	let maxVal = $derived(Math.max(...data.map(d => d.value), 1));

	// Layout dimensions
	let padding = $derived(
		layout === 'horizontal'
			? { top: 15, right: 80, bottom: 15, left: 140 }
			: { top: 20, right: 20, bottom: 40, left: 50 }
	);

	let innerWidth = $derived(Math.max(width - padding.left - padding.right, 50));
	let innerHeight = $derived(Math.max(height - padding.top - padding.bottom, 50));

	let barWidth = $derived(innerWidth / (data.length || 1));
	let barGap = $derived(barWidth * 0.25);
</script>

<div class="bar-chart-container" bind:clientWidth={width} style="height: {height}px;" role="img">
	{#if width > 0 && data.length > 0}
		<svg {height} width={width || 500}>
			<defs>
				<linearGradient id="bar-gradient" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stop-color={color} stop-opacity="0.6" />
					<stop offset="100%" stop-color={color} stop-opacity="1" />
				</linearGradient>
				<linearGradient id="bar-gradient-v" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={color} stop-opacity="1" />
					<stop offset="100%" stop-color={color} stop-opacity="0.5" />
				</linearGradient>
			</defs>

			{#if layout === 'horizontal'}
				<!-- Horizontal Bars (Best for Top Customers, Top Extras) -->
				{#each data as item, i}
					{@const y = padding.top + (i * innerHeight) / data.length}
					{@const barH = (innerHeight / data.length) - 6}
					{@const barW = (item.value / maxVal) * innerWidth}
					
					<!-- Row background highlight on hover -->
					<rect
						x="0"
						{y}
						width={width}
						height={barH + 6}
						fill="currentColor"
						class="hover-bg"
						opacity={activeIndex === i ? 0.03 : 0}
						onmouseenter={() => activeIndex = i}
						onmouseleave={() => activeIndex = null}
					/>

					<!-- Label (Room / Customer) -->
					<text
						x={padding.left - 15}
						y={y + barH / 2 + 4}
						text-anchor="end"
						class="chart-label font-medium"
					>
						{item.label.length > 18 ? item.label.slice(0, 16) + '..' : item.label}
					</text>

					<!-- Colored Bar -->
					<rect
						x={padding.left}
						{y}
						width={Math.max(barW, 3)}
						height={barH}
						rx={Math.min(barH / 2, 4)}
						fill="url(#bar-gradient)"
						class="transition-all duration-300 ease-out cursor-pointer"
						onmouseenter={() => activeIndex = i}
						onmouseleave={() => activeIndex = null}
					/>

					<!-- Value Label -->
					<text
						x={padding.left + barW + 10}
						y={y + barH / 2 + 4}
						text-anchor="start"
						class="chart-value font-bold"
					>
						${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
					</text>
				{/each}
			{:else}
				<!-- Vertical Bars (Best for Room Type Occupancy, category counts) -->
				{#each data as item, i}
					{@const x = padding.left + i * barWidth + barGap / 2}
					{@const barW = barWidth - barGap}
					{@const barH = (item.value / maxVal) * innerHeight}
					{@const y = padding.top + innerHeight - barH}

					<!-- Col background highlight on hover -->
					<rect
						{x}
						y={padding.top}
						width={barW + barGap}
						height={innerHeight}
						fill="currentColor"
						class="hover-bg"
						opacity={activeIndex === i ? 0.03 : 0}
						onmouseenter={() => activeIndex = i}
						onmouseleave={() => activeIndex = null}
					/>

					<!-- Grid baseline -->
					<line
						x1={padding.left}
						y1={padding.top + innerHeight}
						x2={width - padding.right}
						y2={padding.top + innerHeight}
						stroke="currentColor"
						class="grid-line"
					/>

					<!-- Colored Bar -->
					<rect
						{x}
						{y}
						width={barW}
						height={Math.max(barH, 3)}
						rx="4"
						fill="url(#bar-gradient-v)"
						class="transition-all duration-300 ease-out cursor-pointer"
						onmouseenter={() => activeIndex = i}
						onmouseleave={() => activeIndex = null}
					/>

					<!-- Label below bar -->
					<text
						x={x + barW / 2}
						y={padding.top + innerHeight + 18}
						text-anchor="middle"
						class="chart-label font-medium"
					>
						{item.label.length > 10 ? item.label.slice(0, 8) + '..' : item.label}
					</text>

					<!-- Value text on top of hover -->
					{#if activeIndex === i}
						<text
							x={x + barW / 2}
							y={y - 8}
							text-anchor="middle"
							class="chart-tooltip-value font-bold"
						>
							${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
						</text>
					{/if}
				{/each}
			{/if}
		</svg>
	{:else}
		<div class="flex items-center justify-center h-full text-sm text-slate-500">
			Sin datos para mostrar
		</div>
	{/if}
</div>

<style>
	@reference "../../../routes/layout.css";
	.bar-chart-container {
		@apply w-full select-none overflow-visible;
	}

	.chart-label {
		@apply fill-slate-500 dark:fill-slate-400 text-xs;
		font-family: 'Outfit', sans-serif;
	}

	.chart-value {
		@apply fill-slate-800 dark:fill-slate-200 text-xs;
		font-family: 'Outfit', sans-serif;
	}

	.chart-tooltip-value {
		@apply fill-[#D4AF37] text-[10px];
		font-family: 'Outfit', sans-serif;
	}

	.hover-bg {
		@apply text-slate-200 dark:text-slate-700 transition-opacity duration-200;
	}

	.grid-line {
		@apply text-slate-200 dark:text-slate-800;
	}
</style>
