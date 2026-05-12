<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import type { RoomRead, RoomAmenityRead } from '$lib/types/room';
	import AmenityIcon from '$lib/components/ui/AmenityIcon.svelte';

	let { room, show = false, onClose }: { room: RoomRead; show: boolean; onClose: () => void } = $props();

	// Use $effect to lock scrolling when modal is open
	$effect(() => {
		if (typeof document !== 'undefined') {
			if (show) {
				document.body.style.overflow = 'hidden';
			} else {
				document.body.style.overflow = '';
			}
		}
	});

	// Group amenities by category if available
	let groupedAmenities = $derived.by(() => {
		const groups: Record<string, RoomAmenityRead[]> = { 'General': [] };
		if (room?.amenities) {
			room.amenities.forEach(am => {
				const catName = am.category?.name || 'General';
				if (!groups[catName]) groups[catName] = [];
				groups[catName].push(am);
			});
		}
		// Sort so General is last or first? Let's just return entries
		return Object.entries(groups).filter(([_, items]) => items.length > 0);
	});
</script>

{#if show && room}
	<div class="modal-backdrop" transition:fade={{ duration: 200 }} onclick={onClose}>
		<div class="modal-content" transition:scale={{ duration: 300, start: 0.95, opacity: 0 }} onclick={e => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Lo que ofrece este lugar</h2>
				<button class="btn-close" onclick={onClose} aria-label="Cerrar">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
				</button>
			</div>
			
			<div class="modal-body">
				{#each groupedAmenities as [category, amenities]}
					<div class="category-group">
						{#if category !== 'General'}
							<h3 class="category-title">{category}</h3>
						{/if}
						<div class="modal-amenities-list">
							{#each amenities as am}
								<div class="modal-amenity-item">
									<span class="am-icon">
									<AmenityIcon name={am.icon || 'sparkles'} size={24} strokeWidth={1.5} />
								</span>
									<span class="am-name">{am.name}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.modal-content {
		background: #fff;
		width: 100%;
		max-width: 600px;
		max-height: 85vh;
		border-radius: 1.5rem;
		box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	:global(html.dark) .modal-content {
		background: #11151d;
		border: 1px solid rgba(255,255,255,0.05);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(0,0,0,0.05);
	}

	:global(html.dark) .modal-header { border-color: rgba(255,255,255,0.05); }

	.modal-header h2 {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0;
		color: #1a1a1a;
	}

	:global(html.dark) .modal-header h2 { color: #f0ece4; }

	.btn-close {
		background: transparent;
		border: none;
		color: #1a1a1a;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	:global(html.dark) .btn-close { color: #f0ece4; }
	.btn-close:hover { background: rgba(0,0,0,0.05); }
	:global(html.dark) .btn-close:hover { background: rgba(255,255,255,0.05); }

	.modal-body {
		padding: 2rem;
		overflow-y: auto;
		flex: 1;
	}

	.modal-body::-webkit-scrollbar { width: 6px; }
	.modal-body::-webkit-scrollbar-track { background: transparent; }
	.modal-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 4px; }
	:global(html.dark) .modal-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }

	.category-group {
		margin-bottom: 2rem;
	}
	.category-group:last-child {
		margin-bottom: 0;
	}

	.category-title {
		font-family: 'Outfit', sans-serif;
		font-size: 1.1rem;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(0,0,0,0.05);
	}

	:global(html.dark) .category-title { color: #fff; border-color: rgba(255,255,255,0.05); }

	.modal-amenities-list {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}

	.modal-amenity-item {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		font-size: 1.1rem;
		color: #333;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid rgba(0,0,0,0.03);
	}

	:global(html.dark) .modal-amenity-item { color: #ccc; border-color: rgba(255,255,255,0.03); }
	.modal-amenity-item:last-child { border-bottom: none; padding-bottom: 0; }

	.modal-amenity-item .am-icon { color: #D4AF37; display: flex; font-size: 1.2rem; }
	.modal-amenity-item .emoji-icon { font-style: normal; }
	.modal-amenity-item .am-name { font-weight: 400; }

	@media (max-width: 768px) {
		.modal-backdrop { padding: 0; align-items: flex-end; }
		.modal-content { max-height: 90vh; border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
	}
</style>
