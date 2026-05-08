<script lang="ts">
    import type { UserProfileRead } from '$lib/types';
    
    interface Props {
        profile: Partial<UserProfileRead>;
        onUpdate: (data: Partial<UserProfileRead>) => void;
    }

    let { profile, onUpdate }: Props = $props();

    // Local state for the form
    let localData = $state({
        person_type: profile.person_type || 'Natural',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        nit: profile.nit || '',
        nrc: profile.nrc || '',
        business_name: profile.business_name || '',
        economic_activity: profile.economic_activity || '',
        address_complement: profile.address_complement || ''
    });

    // Notify parent of changes
    $effect(() => {
        onUpdate(localData);
    });

	function applyNITMask(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value.replace(/\D/g, '');
		if (val.length > 14) val = val.slice(0, 14);

		let formatted = '';
		if (val.length > 0) formatted += val.slice(0, 4);
		if (val.length > 4) formatted += '-' + val.slice(4, 10);
		if (val.length > 10) formatted += '-' + val.slice(10, 13);
		if (val.length > 13) formatted += '-' + val.slice(13, 14);
		
		input.value = formatted;
		localData.nit = input.value;
	}

	function applyNRCMask(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value.replace(/\D/g, '');
		if (val.length > 8) val = val.slice(0, 8);

		if (val.length > 1) {
			const dashPos = val.length - 1;
			input.value = val.slice(0, dashPos) + '-' + val.slice(dashPos);
		} else {
			input.value = val;
		}
		localData.nrc = input.value;
	}
</script>

<div class="bg-white/50 dark:bg-slate-900/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
    <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h10"/></svg>
        </div>
        <h4 class="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">Información de Crédito Fiscal</h4>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Tipo de Persona -->
        <div class="space-y-2 md:col-span-2">
            <label class="block text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de Persona</label>
            <div class="grid grid-cols-2 gap-2 max-w-xs">
                <button 
                    type="button"
                    onclick={() => localData.person_type = 'Natural'}
                    class="px-4 py-2 text-xs font-bold rounded-xl border transition-all {localData.person_type === 'Natural' ? 'bg-[#D4AF37] border-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}"
                >
                    Natural
                </button>
                <button 
                    type="button"
                    onclick={() => localData.person_type = 'Juridica'}
                    class="px-4 py-2 text-xs font-bold rounded-xl border transition-all {localData.person_type === 'Juridica' ? 'bg-[#D4AF37] border-[#D4AF37] text-white shadow-lg shadow-[#D4AF37]/20' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}"
                >
                    Jurídica
                </button>
            </div>
        </div>

        {#if localData.person_type === 'Juridica'}
            <!-- Razón Social -->
            <div class="space-y-2 md:col-span-2">
                <label for="business_name" class="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Razón Social
                </label>
                <input 
                    type="text" 
                    id="business_name"
                    bind:value={localData.business_name}
                    placeholder="Ej. Inversiones S.A. de C.V."
                    class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all"
                />
            </div>
        {/if}

        <!-- Nombres -->
        <div class="space-y-2">
            <label for="first_name" class="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                {localData.person_type === 'Juridica' ? 'Nombres del Representante' : 'Nombres del Contribuyente'}
            </label>
            <input 
                type="text" 
                id="first_name"
                bind:value={localData.first_name}
                placeholder="Ej. Juan Carlos"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all"
            />
        </div>

        <!-- Apellidos -->
        <div class="space-y-2">
            <label for="last_name" class="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                {localData.person_type === 'Juridica' ? 'Apellidos del Representante' : 'Apellidos del Contribuyente'}
            </label>
            <input 
                type="text" 
                id="last_name"
                bind:value={localData.last_name}
                placeholder="Ej. Pérez Gómez"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all"
            />
        </div>

        <!-- NIT -->
        <div class="space-y-2">
            <label for="nit" class="block text-[10px] font-black uppercase tracking-widest text-slate-500">NIT</label>
            <input 
                type="text" 
                id="nit"
                value={localData.nit}
                oninput={applyNITMask}
                placeholder="0000-000000-000-0"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all"
            />
        </div>

        <!-- NRC -->
        <div class="space-y-2">
            <label for="nrc" class="block text-[10px] font-black uppercase tracking-widest text-slate-500">NRC</label>
            <input 
                type="text" 
                id="nrc"
                value={localData.nrc}
                oninput={applyNRCMask}
                placeholder="Registro de Contribuyente"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all"
            />
        </div>

        <!-- Giro -->
        <div class="md:col-span-2 space-y-2">
            <label for="economic_activity" class="block text-[10px] font-black uppercase tracking-widest text-slate-500">Giro / Actividad Económica</label>
            <input 
                type="text" 
                id="economic_activity"
                bind:value={localData.economic_activity}
                placeholder="Ej. Servicios de Hostelería"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all"
            />
        </div>

        <!-- Dirección -->
        <div class="md:col-span-2 space-y-2">
            <label for="address_complement" class="block text-[10px] font-black uppercase tracking-widest text-slate-500">Dirección Fiscal</label>
            <textarea 
                id="address_complement"
                bind:value={localData.address_complement}
                placeholder="Dirección completa para facturación"
                rows="2"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] outline-none transition-all resize-none"
            ></textarea>
        </div>
    </div>
</div>

