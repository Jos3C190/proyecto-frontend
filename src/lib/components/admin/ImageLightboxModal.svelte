<script lang="ts">
	let { show = $bindable(), images = [], currentIndex = $bindable() } = $props<{
		show: boolean;
		images: { url: string }[];
		currentIndex: number;
	}>();

	function close() {
		show = false;
	}

	function navigateImage(dir: number, e: Event) {
		e.stopPropagation();
		if (images.length === 0) return;
		currentIndex = (currentIndex + dir + images.length) % images.length;
	}
</script>

{#if show && images.length > 0}
<div class="fixed inset-0 z-[3000] flex items-center justify-center bg-black/90 p-4 transition-opacity" role="dialog" aria-modal="true" onclick={close} onkeydown={(e) => {
	if(e.key === 'Escape') close();
	if(e.key === 'ArrowLeft') navigateImage(-1, e);
	if(e.key === 'ArrowRight') navigateImage(1, e);
}}>
	<div class="relative max-w-5xl w-full flex items-center justify-center outline-none" role="document" tabindex="0">
		<button type="button" class="absolute top-0 right-0 z-10 m-2 p-2 bg-black/50 text-white hover:bg-white hover:text-black rounded-full transition-colors leading-none text-2xl w-10 h-10 flex items-center justify-center" onclick={close} aria-label="Cerrar imagen">&times;</button>
		
		{#if images.length > 1}
			<button type="button" class="absolute left-0 z-10 p-3 m-2 bg-black/50 text-white hover:bg-white hover:text-black hover:scale-110 rounded-full transition-all text-2xl leading-none flex items-center justify-center select-none" onclick={(e) => navigateImage(-1, e)} aria-label="Anterior">
				&#10094;
			</button>
		{/if}

		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<img src={images[currentIndex].url} alt="Foto ampliada" class="max-h-[85vh] max-w-full rounded shadow-2xl object-contain" onclick={(e) => e.stopPropagation()} />

		{#if images.length > 1}
			<button type="button" class="absolute right-0 z-10 p-3 m-2 bg-black/50 text-white hover:bg-white hover:text-black hover:scale-110 rounded-full transition-all text-2xl leading-none flex items-center justify-center select-none" onclick={(e) => navigateImage(1, e)} aria-label="Siguiente">
				&#10095;
			</button>
		{/if}
		
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-xs" onclick={(e) => e.stopPropagation()}>
			{currentIndex + 1} / {images.length}
		</div>
	</div>
</div>
{/if}
