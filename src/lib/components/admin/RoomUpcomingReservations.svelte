<script lang="ts">
    import { onMount } from 'svelte';
    import { getAdminReservations } from '$lib/services/reservation.service';
    import type { ReservationRead } from '$lib/types/reservation';

    let { roomId } = $props<{ roomId: number }>();

    let reservations = $state<ReservationRead[]>([]);
    let loading = $state(true);

    const upcomingReservations = $derived.by(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        return reservations
            .filter(r => new Date(r.check_in) >= now)
            .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())
            .slice(0, 5);
    });

    async function loadReservations() {
        loading = true;
        try {
            reservations = await getAdminReservations(roomId);
        } catch (err) {
            console.error(err);
        } finally {
            loading = false;
        }
    }

    // Traducir estados para mejor legibilidad
    const statusMap: Record<string, { label: string, class: string }> = {
        'pending': { label: 'Pendiente', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        'confirmed': { label: 'Confirmada', class: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        'cancelled': { label: 'Cancelada', class: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' }
    };

    onMount(loadReservations);
</script>

<div class="upcoming-reservations-card bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800/50">
    <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-500">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h2 class="text-xl font-bold font-['Outfit'] text-slate-800 dark:text-slate-100 uppercase tracking-wide">Próximos Huéspedes</h2>
        </div>
        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{upcomingReservations.length} Programados</span>
    </div>

    <div class="space-y-3">
        {#if loading}
            {#each Array(3) as _}
                <div class="h-20 bg-slate-50 dark:bg-slate-950/20 rounded-2xl animate-pulse"></div>
            {/each}
        {:else if upcomingReservations.length === 0}
            <div class="text-center py-12 bg-slate-50/50 dark:bg-slate-950/20 rounded-[24px] border border-dashed border-slate-200 dark:border-slate-800">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin reservaciones futuras</p>
                <p class="text-[9px] text-slate-500 mt-1 uppercase">El calendario está libre por el momento</p>
            </div>
        {:else}
            {#each upcomingReservations as res}
                <div class="group flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:border-emerald-500/20">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 group-hover:text-emerald-500 transition-colors">
                            {#if res.user?.profile}
                                {res.user.profile.first_name[0]}{res.user.profile.last_name[0]}
                            {:else}
                                {res.user?.email.substring(0, 2).toUpperCase() || '??'}
                            {/if}
                        </div>
                        <div>
                            <p class="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                                {#if res.user?.profile}
                                    {res.user.profile.first_name} {res.user.profile.last_name}
                                {:else}
                                    {res.user?.email}
                                {/if}
                            </p>
                            <p class="text-[10px] text-slate-400 font-medium">Del {new Date(res.check_in + 'T12:00:00').toLocaleDateString()} al {new Date(res.check_out + 'T12:00:00').toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter {statusMap[res.status]?.class || ''}">
                            {statusMap[res.status]?.label || res.status}
                        </span>
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>
