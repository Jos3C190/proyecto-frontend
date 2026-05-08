<script lang="ts">
    import type { RoomRead, RoomPriceHistoryResponse } from '$lib/types/room';
    import { formatToElSalvadorDate, getElSalvadorDateObj } from '$lib/utils/date';
    
    let { room, priceHistory } = $props<{
        room: RoomRead;
        priceHistory: RoomPriceHistoryResponse;
    }>();

    // Generar proyección para los próximos 30 días
    const daysToProject = 30;
    
    function calculateDailyPrice(dateStr: string) {
        const targetD = new Date(dateStr + 'T23:59:59');
        
        // Temporada activa más reciente creada antes de la fecha target
        const activeSeasons = (priceHistory.season_prices || []).filter(sp => 
            sp.start_date <= dateStr && sp.end_date >= dateStr
            && new Date(sp.created_at || '') <= targetD
        ).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        
        const activeSp = activeSeasons.length > 0 ? activeSeasons[0] : null;

        // Precio base más reciente creado antes de la fecha target
        const activeBasePrices = (priceHistory.base_prices || []).filter(bp => 
            new Date(bp.created_at || '') <= targetD
        ).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        
        const basePrice = activeBasePrices.length > 0 ? Number(activeBasePrices[0].base_price) : Number(room.base_price);

        if (activeSp) {
            return basePrice * Number(activeSp.price_multiplier);
        }
        return basePrice;
    }

    function getLocalDateString(d: Date) {
        return formatToElSalvadorDate(d);
    }

    const projectionData = $derived.by(() => {
        const data = [];
        const start = getElSalvadorDateObj();
        
        for (let i = 0; i < daysToProject; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = getLocalDateString(d);
            const price = calculateDailyPrice(dateStr);
            data.push({ date: d, price });
        }
        return data;
    });

    // SVG Math
    const chartHeight = 120;
    const chartWidth = 600;
    const padding = 20;

    const minPrice = $derived(Math.min(...projectionData.map(d => d.price)) * 0.9);
    const maxPrice = $derived(Math.max(...projectionData.map(d => d.price)) * 1.1);
    
    const points = $derived(projectionData.map((d, i) => {
        const x = (i / (daysToProject - 1)) * (chartWidth - 2 * padding) + padding;
        const y = chartHeight - padding - ((d.price - minPrice) / (maxPrice - minPrice)) * (chartHeight - 2 * padding);
        return `${x},${y}`;
    }).join(' '));

    const areaPoints = $derived(`${points} ${chartWidth - padding},${chartHeight - padding} ${padding},${chartHeight - padding}`);

    // INTERACTVIDAD (HOVER)
    let hoveredIndex = $state<number | null>(null);
    let svgElement = $state<SVGSVGElement>();

    function handleMouseMove(e: MouseEvent) {
        const container = e.currentTarget as HTMLElement;
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        // El contenido del SVG está dentro de un padding de 1rem (16px) del contenedor div p-4
        // Pero para simplificar, usamos el ancho total del rect del container
        const ratioX = Math.max(0, Math.min(1, mouseX / rect.width));
        const svgMouseX = ratioX * chartWidth;
        
        // Encontrar el punto más cercano dentro del área del gráfico (considerando padding interno del SVG)
        if (svgMouseX <= padding) {
            hoveredIndex = 0;
        } else if (svgMouseX >= chartWidth - padding) {
            hoveredIndex = projectionData.length - 1;
        } else {
            const chartAreaWidth = chartWidth - 2 * padding;
            const xInChart = svgMouseX - padding;
            const relativeX = xInChart / chartAreaWidth;
            hoveredIndex = Math.round(relativeX * (daysToProject - 1));
        }
    }

    function handleMouseLeave() {
        hoveredIndex = null;
    }

    const hoveredData = $derived(hoveredIndex !== null ? projectionData[hoveredIndex] : null);
    const hoveredX = $derived(hoveredIndex !== null ? (hoveredIndex / (daysToProject - 1)) * (chartWidth - 2 * padding) + padding : 0);
    const hoveredY = $derived(hoveredData ? chartHeight - padding - ((hoveredData.price - minPrice) / (maxPrice - minPrice)) * (chartHeight - 2 * padding) : 0);

</script>

<div class="price-projection-card bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
    <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
            </div>
            <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Tendencia de Precios</h2>
        </div>
        <div class="text-right">
            
            <p class="text-xs font-bold text-indigo-600 uppercase italic">Próximos 30 Días</p>
        </div>
    </div>

    <!-- Chart Container -->
    <div 
        class="relative w-full overflow-visible group/chart bg-slate-50 dark:bg-slate-950/30 rounded-[28px] p-4 border border-slate-100 dark:border-slate-800"
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
    >
        <svg 
            bind:this={svgElement}
            viewBox="0 0 {chartWidth} {chartHeight}" 
            class="w-full h-auto overflow-visible cursor-crosshair pointer-events-none"
        >
            <!-- Grid Lines -->
            <line x1={padding} y1={padding} x2={chartWidth-padding} y2={padding} stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-width="1" stroke-dasharray="4" />
            <line x1={padding} y1={chartHeight-padding} x2={chartWidth-padding} y2={chartHeight-padding} stroke="currentColor" class="text-slate-200 dark:text-slate-800" stroke-width="1" />

            <!-- Area Fill -->
            <polyline points={areaPoints} fill="url(#chartGradient)" opacity="0.1" />
            
            <!-- Price Line -->
            <polyline points={points} fill="none" stroke="#6366f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-sm" />

            <!-- Indicador de Selección (Hover) -->
            {#if hoveredData}
                <line 
                    x1={hoveredX} 
                    y1={padding} 
                    x2={hoveredX} 
                    y2={chartHeight - padding} 
                    stroke="#6366f1" 
                    stroke-width="1" 
                    stroke-dasharray="4"
                    class="transition-all duration-75"
                />
                <circle 
                    cx={hoveredX} 
                    cy={hoveredY} 
                    r="5" 
                    fill="#6366f1" 
                    stroke="white" 
                    stroke-width="2"
                    class="drop-shadow-sm transition-all duration-75"
                />
            {/if}

            <!-- Current Price marker (first point) - Solo si no hay hover -->
            {#if projectionData.length > 0 && !hoveredData}
                <circle cx={padding} cy={points.split(',')[1].split(' ')[0]} r="4" fill="#6366f1" />
                <text x={padding + 5} y={points.split(',')[1].split(' ')[0] - 10} class="text-[10px] font-black fill-indigo-600 dark:fill-indigo-400">${projectionData[0].price.toFixed(0)}</text>
            {/if}

            <!-- Defines for Gradient -->
            <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#6366f1" />
                    <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
                </linearGradient>
            </defs>
        </svg>

        <!-- Tooltip flotante -->
        {#if hoveredData}
            <div 
                class="absolute z-[100] pointer-events-none bg-slate-900 dark:bg-indigo-600 text-white p-2.5 rounded-xl shadow-2xl -translate-y-[125%] -translate-x-1/2 transition-all duration-75 border border-white/20 backdrop-blur-md"
                style="left: {(hoveredX / chartWidth) * 100}%; top: {padding}px"
            >
                <p class="text-[9px] font-black uppercase tracking-widest opacity-80 mb-0.5 whitespace-nowrap">
                    {hoveredData.date.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
                </p>
                <p class="text-sm font-black tracking-tight">${hoveredData.price.toFixed(2)}</p>
                <!-- Triangulito del tooltip -->
                <div class="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900 dark:bg-indigo-600 rotate-45 border-r border-b border-white/10"></div>
            </div>
        {/if}

        <div class="flex justify-between mt-4 px-2">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hoy</span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">15 Días</span>
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">30 Días</span>
        </div>
    </div>

    
</div>
