<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	interface Props {
		value: string;
		onSelect: (val: string) => void;
	}

	let { value, onSelect }: Props = $props();

	let isOpen = $state(false);
	let count = $derived(parseInt(value) || 1);

	function updateCount(delta: number) {
		const newCount = Math.max(1, Math.min(4, count + delta));
		onSelect(newCount.toString());
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (isOpen && !target.closest('.guestpicker-container')) {
			isOpen = false;
		}
	}

	onMount(() => {
		window.addEventListener('click', handleClickOutside);
		return () => window.removeEventListener('click', handleClickOutside);
	});
</script>

<div class="guestpicker-container">
	<div 
		class="guestpicker-trigger" 
		onclick={() => isOpen = !isOpen}
		onkeydown={(e) => e.key === 'Enter' && (isOpen = !isOpen)}
		role="button"
		tabindex="0"
	>
		<label>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
			Huéspedes
		</label>
		<div class="value-display">
			{count} {count === 1 ? 'Persona' : 'Personas'}
			<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transform {isOpen ? 'rotate-180' : ''} transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
		</div>
	</div>

	{#if isOpen}
		<div class="guest-dropdown" in:scale={{ duration: 200, start: 0.95 }} out:fade={{ duration: 150 }}>
			<div class="guest-row">
				<div class="guest-info">
					<span class="guest-label">Total Huéspedes</span>
					<span class="guest-desc">Adultos y niños</span>
				</div>
				<div class="guest-controls">
					<button type="button" class="ctrl-btn" onclick={() => updateCount(-1)} disabled={count <= 1}>&minus;</button>
					<span class="count-num">{count}</span>
					<button type="button" class="ctrl-btn" onclick={() => updateCount(1)} disabled={count >= 4}>&plus;</button>
				</div>
			</div>
			
			<div class="dropdown-footer">
				Capacidad máxima por reserva: 4 personas.
			</div>
		</div>
	{/if}
</div>

<style>
	.guestpicker-container { position: relative; width: 100%; }
	.guestpicker-trigger { cursor: pointer; display: flex; flex-direction: column; }
	.guestpicker-trigger label {
		font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2.5px;
		color: #D4AF37; font-weight: 800; display: flex; align-items: center;
		gap: 0.75rem; margin-bottom: 0.5rem; opacity: 0.8;
	}
	.value-display {
		color: white; font-size: 1.1rem; font-family: 'Outfit', sans-serif;
		font-weight: 400; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
	}
	.guest-dropdown {
		position: absolute; bottom: calc(100% + 1.5rem); right: 0; width: 280px;
		background: rgba(15, 20, 28, 0.98); backdrop-filter: blur(30px);
		border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 2rem; padding: 1.5rem;
		z-index: 500; box-shadow: 0 30px 70px rgba(0,0,0,0.8);
	}
	.guest-row { display: flex; justify-content: space-between; align-items: center; }
	.guest-info { display: flex; flex-direction: column; }
	.guest-label { font-family: 'Outfit'; color: white; font-weight: 600; font-size: 1rem; }
	.guest-desc { font-size: 0.7rem; color: rgba(255, 255, 255, 0.4); }
	.guest-controls { display: flex; align-items: center; gap: 1.25rem; }
	.ctrl-btn {
		width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(212, 175, 55, 0.3);
		background: transparent; color: white; cursor: pointer; display: flex; align-items: center;
		justify-content: center; transition: all 0.3s; font-size: 1.2rem;
	}
	.ctrl-btn:hover:not(:disabled) { background: #D4AF37; color: #0B0E14; border-color: #D4AF37; }
	.ctrl-btn:disabled { opacity: 0.2; cursor: not-allowed; }
	.count-num { font-family: 'Outfit'; font-weight: 600; color: white; font-size: 1.2rem; min-width: 20px; text-align: center; }
	.dropdown-footer {
		margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.65rem; color: rgba(255, 255, 255, 0.4); text-align: center;
	}
</style>
