<script lang="ts">
	import { parsePhoneNumber, getCountries, getCountryCallingCode, type CountryCode, isValidPhoneNumber } from 'libphonenumber-js';
	import { Country } from 'country-state-city';

	interface Props {
		value: string; // E.164 format
		isValid?: boolean;
		label?: string;
		id?: string;
		required?: boolean;
		onchange?: (val: string) => void;
	}

	let { value = $bindable(''), isValid = $bindable(true), label = 'Teléfono', id = 'phone-input', required = false, onchange }: Props = $props();

	let selectedCountry = $state<CountryCode>('SV');
	let displayValue = $state(''); // National format (what user types)
	let isOpen = $state(false);
	let searchTerm = $state('');
	let containerElement: HTMLElement;
	let initialized = $state(false);
	let touched = $state(false);
	let inputElement: HTMLInputElement;

	const allCountries = getCountries().map(code => {
		const c = Country.getCountryByCode(code);
		return {
			code,
			name: c?.name || code,
			callingCode: getCountryCallingCode(code)
		};
	}).sort((a, b) => a.name.localeCompare(b.name));

	let filteredCountries = $derived(
		allCountries.filter(c => 
			c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
			c.callingCode.includes(searchTerm)
		)
	);

	let currentCountryInfo = $derived(allCountries.find(c => c.code === selectedCountry));

	// On mount and when value changes, sync if not yet touched by user
	$effect(() => {
		if (value && !touched && !initialized) {
			try {
				const phoneNumber = parsePhoneNumber(value);
				if (phoneNumber) {
					selectedCountry = phoneNumber.country || 'SV';
					displayValue = phoneNumber.formatNational();
					initialized = true;
				}
			} catch (e) {
				// If parsing fails, just show the raw value
				displayValue = value;
				initialized = true;
			}
		}
	});

	// Derive internal validity based purely on what's typed + country
	let internalIsValid = $derived.by(() => {
		if (!displayValue) return !required;
		try {
            // Evaluamos el número completo (Código de país + dígitos ingresados)
            const fullNumber = `+${currentCountryInfo?.callingCode}${displayValue.replace(/\D/g, '')}`;
			return isValidPhoneNumber(fullNumber);
		} catch (e) {
			return false;
		}
	});

	// Sincronizar estado de validación con el exterior
	$effect(() => {
		isValid = internalIsValid;
	});

	// Mostrar error visual solo si el input fue "tocado" (perdió el foco) o si intentó guardar
	let showVisualError = $derived.by(() => {
		if (!touched) return false;
		if (!displayValue && required) return true;
		if (!displayValue && !required) return false;
		return !internalIsValid;
	});

	// Integración con validación nativa de HTML5 para bloquear el envío del formulario
	$effect(() => {
		if (inputElement) {
			if (!displayValue && !required) {
				inputElement.setCustomValidity('');
			} else if (!internalIsValid) {
				inputElement.setCustomValidity(`Número inválido para ${currentCountryInfo?.name || selectedCountry}`);
			} else {
				inputElement.setCustomValidity('');
			}
		}
	});

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		touched = true; // User started typing
		// Solo permitir números, espacios y guiones en la vista nacional
		let raw = input.value.replace(/[^\d\s-]/g, '');
		displayValue = raw;
		
		// Calcular el valor internacional (E.164) para exportar
		const digits = raw.replace(/\D/g, '');
		value = digits === '' ? '' : `+${currentCountryInfo?.callingCode}${digits}`;
		
		if (onchange) onchange(value);
	}

	function handleBlur() {
		touched = true;
	}

	function selectCountry(code: CountryCode) {
		selectedCountry = code;
		isOpen = false;
		searchTerm = '';
		touched = true;
		
		// Recalcular el valor E.164 con el nuevo país
		const digits = displayValue.replace(/\D/g, '');
		value = digits === '' ? '' : `+${currentCountryInfo?.callingCode}${digits}`;
		
		if (onchange) onchange(value);
	}

	function handleGlobalClick(e: MouseEvent) {
		if (containerElement && !containerElement.contains(e.target as Node)) {
			isOpen = false;
			searchTerm = '';
		}
	}
</script>

<svelte:window onclick={handleGlobalClick} />

<div class="admin-field phone-input-container" bind:this={containerElement}>
	{#if label}
		<label for={id} class={showVisualError ? 'text-rose-500 dark:text-rose-400' : ''}>
			{label}
			{#if showVisualError}
				<span class="ml-2 text-[9px] lowercase italic font-medium tracking-normal text-rose-500 opacity-80">(Número inválido para {currentCountryInfo?.name})</span>
			{/if}
		</label>
	{/if}
	
	<div class="relative flex items-center bg-slate-50/50 dark:bg-slate-800/50 border rounded-2xl transition-all focus-within:ring-4 h-[50px] 
		{!showVisualError ? 'border-slate-300 dark:border-slate-600 focus-within:border-[#D4AF37] focus-within:ring-[#D4AF37]/10' : 'border-rose-500 dark:border-rose-500/50 focus-within:ring-rose-500/10'}">
		
		<!-- Custom Country Selector -->
		<div class="relative h-full flex items-center">
			<button 
				type="button"
				onclick={() => (isOpen = !isOpen)}
				class="h-full px-4 flex items-center gap-2 border-r transition-colors cursor-pointer group shrink-0 rounded-l-2xl
					{!showVisualError ? 'border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700/50' : 'border-rose-500 dark:border-rose-500/50 hover:bg-rose-50 dark:hover:bg-rose-500/10'}"
			>
				<img 
					src="https://flagcdn.com/w40/{selectedCountry.toLowerCase()}.png" 
					alt={selectedCountry}
					class="w-5 h-auto rounded-sm shadow-sm"
					onerror={(e) => (e.currentTarget.src = 'https://flagcdn.com/w40/un.png')}
				/>
				<span class="text-xs font-bold {!showVisualError ? 'text-slate-600 dark:text-slate-400' : 'text-rose-600 dark:text-rose-400'}">+{currentCountryInfo?.callingCode}</span>
				<svg class="w-3 h-3 text-slate-400 group-hover:text-[#D4AF37] transition-colors {isOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path d="M19 9l-7 7-7-7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>

			{#if isOpen}
				<div class="absolute top-[calc(100%+8px)] left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[3000] overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-left">
					<div class="p-2 border-b border-slate-100 dark:border-slate-800">
						<input 
							type="text" 
							bind:value={searchTerm} 
							placeholder="Buscar país..." 
							class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-[#D4AF37]/20 text-slate-800 dark:text-slate-200"
							onclick={(e) => e.stopPropagation()}
						/>
					</div>
					
					<div class="max-h-60 overflow-y-auto p-1">
						{#each filteredCountries as country}
							<button 
								type="button"
								class="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
								onclick={() => selectCountry(country.code as CountryCode)}
							>
								<img 
									src="https://flagcdn.com/w40/{country.code.toLowerCase()}.png" 
									alt={country.name}
									class="w-5 h-auto rounded-sm shrink-0"
									onerror={(e) => (e.currentTarget.src = 'https://flagcdn.com/w40/un.png')}
								/>
								<div class="flex-1 overflow-hidden">
									<p class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{country.name}</p>
									<p class="text-[10px] text-slate-400">+{country.callingCode}</p>
								</div>
								{#if selectedCountry === country.code}
									<svg class="w-4 h-4 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
								{/if}
							</button>
						{/each}
						{#if filteredCountries.length === 0}
							<p class="text-[10px] text-slate-400 text-center py-4 italic">No se encontraron resultados</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<input 
			{id}
			bind:this={inputElement}
			type="tel" 
			value={displayValue}
			oninput={handleInput}
			onblur={handleBlur}
			placeholder="Número de celular"
			{required}
			class="flex-1 !bg-transparent !border-none !py-0 !px-4 !shadow-none text-slate-800 dark:text-slate-200 outline-none font-medium placeholder:text-slate-400/60 h-full rounded-r-2xl"
		/>
	</div>
</div>
