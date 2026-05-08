<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import type { RoomRead } from '$lib/types/room';
	import { getElSalvadorDate, formatToElSalvadorDate } from '$lib/utils/date';

	interface Props {
		startDate: string;
		endDate: string;
		rooms: RoomRead[];
		onSelect: (start: string, end: string) => void;
	}

	let { startDate, endDate, rooms, onSelect }: Props = $props();

	let isOpen = $state(false);
	let currentMonth = $state(new Date());
	
	const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
	const months = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];

	function getDaysInMonth(year: number, month: number) {
		return new Date(year, month + 1, 0).getDate();
	}

	function getFirstDayOfMonth(year: number, month: number) {
		return new Date(year, month, 1).getDay();
	}

	function formatDate(date: Date): string {
		return formatToElSalvadorDate(date);
	}

	function getPriceForDate(dateStr: string): number | null {
		if (rooms.length === 0) return null;
		const prices = rooms.map(room => {
			let multiplier = 1.0;
			if (room.season_prices) {
				const activeSeason = room.season_prices.find(s => 
					dateStr >= s.start_date && dateStr <= s.end_date && !s.is_archived
				);
				if (activeSeason) multiplier = activeSeason.price_multiplier;
			}
			return room.base_price * multiplier;
		});
		return Math.min(...prices);
	}

	function handleDateClick(dateStr: string) {
		if (!startDate || (startDate && endDate)) {
			// Start new selection
			onSelect(dateStr, '');
		} else {
			// Selecting end date
			if (dateStr < startDate) {
				onSelect(dateStr, '');
			} else if (dateStr === startDate) {
				onSelect('', '');
			} else {
				onSelect(startDate, dateStr);
				isOpen = false; // Close when range is complete
			}
		}
	}

	function nextMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
	}

	function prevMonth() {
		currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
	}

	const calendarDays = $derived.by(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const daysInMonth = getDaysInMonth(year, month);
		const firstDay = getFirstDayOfMonth(year, month);
		
		const days = [];
		for (let i = 0; i < firstDay; i++) days.push(null);
		
		for (let i = 1; i <= daysInMonth; i++) {
			const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
			// We still need a date object for some UI parts (getDate() below), 
			// but we'll use one that parses the dateStr correctly as local midnight
			const date = new Date(dateStr + 'T00:00:00'); 
			
			days.push({
				date,
				dateStr,
				price: getPriceForDate(dateStr),
				isToday: getElSalvadorDate() === dateStr,
				isStart: startDate === dateStr,
				isEnd: endDate === dateStr,
				isInRange: startDate && endDate && dateStr > startDate && dateStr < endDate,
				isPast: dateStr < getElSalvadorDate()
			});
		}
		return days;
	});

	let displayValue = $derived.by(() => {
		if (!startDate) return 'Seleccionar fechas';
		if (!endDate) return `${startDate} - ...`;
		return `${startDate} / ${endDate}`;
	});

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (isOpen && !target.closest('.datepicker-container')) {
			isOpen = false;
		}
	}

	onMount(() => {
		window.addEventListener('click', handleClickOutside);
		return () => window.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="datepicker-container">
	<div 
		class="datepicker-trigger" 
		onclick={() => isOpen = !isOpen}
		onkeydown={(e) => e.key === 'Enter' && (isOpen = !isOpen)}
		role="button"
		tabindex="0"
	>
		<label>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
			Estadía
		</label>
		<div class="value-display">
			{displayValue}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transform {isOpen ? 'rotate-180' : ''} transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
		</div>
	</div>

	{#if isOpen}
		<div class="calendar-dropdown" in:scale={{ duration: 200, start: 0.95 }} out:fade={{ duration: 150 }}>
			<div class="calendar-header">
				<button type="button" onclick={prevMonth} class="nav-btn">&larr;</button>
				<span class="month-name">{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
				<button type="button" onclick={nextMonth} class="nav-btn">&rarr;</button>
			</div>
			
			<div class="days-grid">
				{#each daysOfWeek as day}
					<div class="weekday">{day}</div>
				{/each}
				
				{#each calendarDays as day}
					{#if day === null}
						<div class="empty-day"></div>
					{:else}
						<button 
							type="button"
							class="day-btn" 
							class:selected-start={day.isStart}
							class:selected-end={day.isEnd}
							class:in-range={day.isInRange}
							class:today={day.isToday}
							class:past={day.isPast}
							disabled={day.isPast}
							onclick={() => handleDateClick(day.dateStr)}
						>
							<span class="day-num">{day.date.getDate()}</span>
							{#if day.price && !day.isPast}
								<span class="day-price">${Math.round(day.price)}</span>
							{/if}
						</button>
					{/if}
				{/each}
			</div>
			
			<div class="calendar-footer">
				<div class="legend">
					<span class="dot"></span> Elija Check-In y Check-Out
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.datepicker-container { position: relative; width: 100%; }
	.datepicker-trigger { cursor: pointer; display: flex; flex-direction: column; }
	.datepicker-trigger label {
		font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2.5px;
		color: #D4AF37; font-weight: 800; display: flex; align-items: center;
		gap: 0.75rem; margin-bottom: 0.5rem; opacity: 0.8;
	}
	.value-display {
		color: white; font-size: 1.1rem; font-family: 'Outfit', sans-serif;
		font-weight: 400; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
	}
	.calendar-dropdown {
		position: absolute;
		bottom: calc(100% + 1.5rem);
		left: 0;
		width: 100%;
		min-width: 320px;
		max-width: 350px;
		background: rgba(15, 20, 28, 0.98);
		backdrop-filter: blur(30px);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 2rem;
		padding: 1.5rem 0.75rem;
		z-index: 500;
		box-shadow: 0 30px 70px rgba(0,0,0,0.8);
	}
	.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding: 0 0.75rem; }
	.month-name { font-family: 'Outfit'; font-weight: 600; color: white; font-size: 1.1rem; }
	.nav-btn {
		background: rgba(255, 255, 255, 0.05); border: none; color: white;
		width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
		display: flex; align-items: center; justify-content: center; transition: all 0.3s;
	}
	.nav-btn:hover { background: rgba(212, 175, 55, 0.2); transform: scale(1.1); }
	.days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
	.weekday { text-align: center; font-size: 0.65rem; color: #D4AF37; font-weight: 800; padding-bottom: 0.75rem; text-transform: uppercase; }
	.day-btn {
		aspect-ratio: 1; background: transparent; border: 1px solid transparent;
		color: rgba(255, 255, 255, 0.8); border-radius: 0.5rem; cursor: pointer;
		display: flex; flex-direction: column; align-items: center; justify-content: center;
		gap: 0; transition: all 0.2s; padding: 2px; position: relative;
	}
	.day-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.08); }
	.day-btn.selected-start, .day-btn.selected-end { background: #D4AF37 !important; color: #0B0E14 !important; font-weight: 800; z-index: 2; }
	.day-btn.in-range { background: rgba(212, 175, 55, 0.15); color: #D4AF37; border-radius: 0; }
	.day-btn.selected-start { border-radius: 0.75rem 0 0 0.75rem; }
	.day-btn.selected-end { border-radius: 0 0.75rem 0.75rem 0; }
	.day-btn.today { border-color: rgba(212, 175, 55, 0.5); }
	.day-btn.past { opacity: 0.2; cursor: not-allowed; }
	.day-num { font-size: 0.95rem; font-family: 'Outfit'; }
	.day-price { font-size: 0.6rem; font-weight: 600; color: #D4AF37; }
	.day-btn.selected-start .day-price, .day-btn.selected-end .day-price { color: #0B0E14; opacity: 0.8; }
	.calendar-footer { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.05); }
	.legend { font-size: 0.65rem; color: rgba(255, 255, 255, 0.5); display: flex; align-items: center; gap: 0.5rem; }
	.dot { width: 8px; height: 8px; background: #D4AF37; border-radius: 50%; }
</style>
