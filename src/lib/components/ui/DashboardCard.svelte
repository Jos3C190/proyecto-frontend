<script lang="ts">
	interface Props {
		title: string;
		value: string | number;
		growth?: number;
		icon?: any;
		subtitle?: string;
		class?: string;
		children?: any;
		extra?: any;
	}

	let { title, value, growth, icon: Icon, subtitle, class: className = '', children, extra }: Props = $props();

	let isPositive = $derived(growth !== undefined && growth >= 0);
</script>

<div class="dashboard-card {className}">
	<div class="card-header">
		<div class="title-section">
			<span class="card-title">{title}</span>
			{#if subtitle}
				<span class="card-subtitle">{subtitle}</span>
			{/if}
		</div>
		{#if Icon}
			<div class="icon-section">
				{@render Icon()}
			</div>
		{/if}
	</div>

	<div class="card-content">
		{#if children}
			{@render children()}
		{:else}
			<div class="value-row">
				<span class="card-value">{value}</span>
				{#if growth !== undefined}
					<div class="growth-badge {isPositive ? 'positive' : 'negative'}">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="growth-icon {isPositive ? '' : 'rotate-180'}">
							<polyline points="18 15 12 9 6 15"/>
						</svg>
						<span>{Math.abs(growth)}%</span>
					</div>
				{/if}
			</div>
			{#if extra}
				<div class="extra-section">
					{@render extra()}
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	@reference "../../../routes/layout.css";
	.dashboard-card {
		@apply relative overflow-hidden rounded-2xl border border-slate-200/50 bg-white/70 p-6 shadow-xl shadow-[#D4AF37]/5 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#D4AF37]/15 dark:border-slate-800/50 dark:bg-slate-900/40 dark:hover:shadow-[#D4AF37]/10;
	}

	.card-header {
		@apply mb-4 flex items-start justify-between;
	}

	.title-section {
		@apply flex flex-col;
	}

	.card-title {
		@apply text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400;
	}

	.card-subtitle {
		@apply mt-1 text-[10px] font-medium text-slate-400 dark:text-slate-500;
	}

	.icon-section {
		@apply rounded-xl bg-[#D4AF37]/10 p-2.5 text-[#D4AF37] dark:bg-[#D4AF37]/20;
	}

	.card-value {
		@apply font-['Outfit'] text-3xl font-light tracking-tight text-slate-900 dark:text-white;
	}

	.value-row {
		@apply flex items-baseline gap-3;
	}

	.growth-badge {
		@apply flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold;
	}

	.growth-badge.positive {
		@apply bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400;
	}

	.growth-badge.negative {
		@apply bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400;
	}

	.growth-icon {
		@apply transition-transform;
	}
	
	.extra-section {
		@apply mt-3 border-t border-slate-100 pt-3 dark:border-slate-800;
	}
</style>
