<script lang="ts">
	import { toast } from '$lib/stores/toast.svelte';
	import { fly } from 'svelte/transition';
    import { backOut } from 'svelte/easing';
</script>

<div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
	{#each toast.toasts as t (t.id)}
		<div
			in:fly={{ y: 20, duration: 400, easing: backOut }}
			out:fly={{ x: 100, duration: 300 }}
			class="pointer-events-auto relative overflow-hidden rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all
                   {t.type === 'success' ? 'border-emerald-500/30 bg-emerald-50/90 text-emerald-900 dark:bg-emerald-900/90 dark:text-emerald-50' : ''}
                   {t.type === 'error' ? 'border-rose-500/30 bg-rose-50/90 text-rose-900 dark:bg-rose-900/90 dark:text-rose-50' : ''}
                   {t.type === 'info' ? 'border-sky-500/30 bg-sky-50/90 text-sky-900 dark:bg-sky-900/90 dark:text-sky-50' : ''}
                   {t.type === 'warning' ? 'border-amber-500/30 bg-amber-50/90 text-amber-900 dark:bg-amber-900/90 dark:text-amber-50' : ''}"
		>
            <div class="flex items-start gap-3">
                <div class="mt-0.5">
                    {#if t.type === 'success'}
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clip-rule="evenodd" /></svg>
                    {:else if t.type === 'error'}
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" /></svg>
                    {:else if t.type === 'warning'}
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
                    {:else}
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clip-rule="evenodd" /></svg>
                    {/if}
                </div>
                <div class="flex-1 text-sm font-medium leading-5">
                    {t.message}
                </div>
                <button
                    onclick={() => toast.remove(t.id)}
                    class="ml-auto -mr-1.5 -mt-1.5 flex h-8 w-8 items-center justify-center rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                >
                    <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
            </div>
            {#if t.duration && t.duration > 0}
                <div class="absolute bottom-0 left-0 h-1 bg-black/10 dark:bg-white/20 animate-shrink" style="animation-duration: {t.duration}ms"></div>
            {/if}
		</div>
	{/each}
</div>

<style>
    @keyframes shrink {
        from { width: 100%; }
        to { width: 0%; }
    }
    .animate-shrink {
        animation-name: shrink;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
    }
</style>
