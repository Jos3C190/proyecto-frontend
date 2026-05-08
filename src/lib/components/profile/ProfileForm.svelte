<script lang="ts">	
	import { authStore } from '$lib/stores/auth.store';
	import { updateProfile, getMyProfile } from '$lib/services/user.service';
	import { Country, State, City } from 'country-state-city';
	import { onMount } from 'svelte';
	import PhoneInput from '$lib/components/admin/PhoneInput.svelte';
	import { formatToElSalvadorDate } from '$lib/utils/date';

	let loading = $state(false);
	let successMsg = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	// Profile States
	let firstName = $state('');
	let lastName = $state('');
	let phone = $state('');
	let isPhoneValid = $state(true);
	let dateOfBirth = $state('');
	let country = $state('SV');
	let department = $state('');
	let municipality = $state('');
	let addressComplement = $state('');
	
	// New Fiscal & ID Fields
	let personType = $state('Natural');
	let documentType = $state('DUI');
	let documentNumber = $state('');
	let nit = $state('');
	let nrc = $state('');
	let businessName = $state('');
	let economicActivity = $state('');

	onMount(async () => {
		try {
			const freshUser = await getMyProfile();
			const p = freshUser.profile;
			firstName = p?.first_name || '';
			lastName = p?.last_name || '';
			phone = p?.phone || '';
			dateOfBirth = p?.date_of_birth || '';
			country = p?.country || 'SV';
			department = p?.department || '';
			municipality = p?.municipality || '';
			addressComplement = p?.address_complement || '';
			
			personType = p?.person_type || 'Natural';
			documentType = p?.document_type || 'DUI';
			documentNumber = p?.document_number || '';
			nit = p?.nit || '';
			nrc = p?.nrc || '';
			businessName = p?.business_name || '';
			economicActivity = p?.economic_activity || '';
		} catch (e) {
			console.error('Error auto-syncing profile', e);
		}
	});

	let countries = $derived(Country.getAllCountries());
	let departments = $derived(country ? State.getStatesOfCountry(country) : []);
	let municipalities = $derived(country && department ? City.getCitiesOfState(country, department) : []);

	let maxDobString = $derived.by(() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 18);
		return formatToElSalvadorDate(d);
	});

	// --- Input Masks ---
	function applyDocumentMask(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value;

		if (documentType === 'DUI') {
			let v = val.replace(/\D/g, ''); 
			if (v.length > 9) v = v.slice(0, 9);
			if (v.length > 8) {
				input.value = v.slice(0, 8) + '-' + v.slice(8);
			} else {
				input.value = v;
			}
		} else {
			input.value = val.toUpperCase();
		}
		documentNumber = input.value;
	}

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
		nit = input.value;
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
		nrc = input.value;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMsg = null;
		successMsg = null;

		if (!firstName.trim()) {
			errorMsg = 'El nombre o razón social es obligatorio.';
			return;
		}

		if (personType === 'Natural' && !lastName.trim()) {
			errorMsg = 'El apellido es obligatorio para personas naturales.';
			return;
		}

		if (personType === 'Juridica' && !nrc) {
			errorMsg = 'El NRC es obligatorio para empresas.';
			return;
		}

		if (phone && !isPhoneValid) {
			errorMsg = 'Por favor, ingresa un número de teléfono válido.';
			return;
		}

		loading = true;

		try {
			await updateProfile({
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				business_name: personType === 'Juridica' ? businessName.trim() : null,
				phone: phone.trim() || null,
				date_of_birth: dateOfBirth || null,
				country: country || null,
				department: department || null,
				municipality: municipality || null,
				address_complement: addressComplement.trim() || null,
				person_type: personType,
				document_type: documentType,
				document_number: documentNumber.trim() || null,
				nit: nit.trim() || null,
				nrc: nrc.trim() || null,
				economic_activity: economicActivity.trim() || null
			});
			successMsg = 'Perfil actualizado correctamente.';
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} catch (err: any) {
			errorMsg = err.message || 'Error al actualizar.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="luxury-profile-layout fade-in">
	<div class="profile-header">
		<h1>Configuración de Perfil</h1>
		<p>Administra tu identidad digital y preferencias fiscales con exclusividad.</p>
	</div>
	
    <div class="form-container">
        {#if errorMsg}
            <div class="alert alert-error">
                <span class="icon">⚠️</span> {errorMsg}
            </div>
        {/if}
        {#if successMsg}
            <div class="alert alert-success">
                <span class="icon">✓</span> {successMsg}
            </div>
        {/if}

        <form class="luxury-form" onsubmit={handleSubmit}>
            
            <div class="cards-layout">
                <!-- SECCIÓN: IDENTIDAD -->
                <div class="section-card">
                    <div class="section-title-wrapper">
                        <div class="title-content">
                            <div class="badge">Identidad</div>
                            <h3>Identificación</h3>
                            <span class="title-desc">Identidad legal y fechas oficiales.</span>
                        </div>
                    </div>

                    <div class="form-stack">
                        <div class="input-group">
                            <label for="person_type">Contribuyente</label>
                            <select id="person_type" bind:value={personType} class="luxury-select">
                                <option value="Natural">Persona Natural</option>
                                <option value="Juridica">Persona Jurídica</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="document_type">Documento</label>
                            <select id="document_type" bind:value={documentType} class="luxury-select">
                                <option value="DUI">DUI (ES)</option>
                                <option value="Pasaporte">Pasaporte</option>
                                <option value="Residente">Carnet</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label for="document_number">Número</label>
                            <input 
                                type="text" 
                                id="document_number" 
                                value={documentNumber} 
                                oninput={applyDocumentMask}
                                placeholder={documentType === 'DUI' ? '00000000-0' : 'Número'} 
                            />
                        </div>
                        <div class="input-group">
                            <label for="dob">F. Nac / Const.</label>
                            <input type="date" id="dob" bind:value={dateOfBirth} max={maxDobString} />
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN: DATOS DE FACTURACIÓN -->
                <div class="section-card featured">
                    <div class="section-title-wrapper">
                        <div class="title-content">
                            <div class="badge gold">Registro Fiscal</div>
                            <h3>{personType === 'Juridica' ? 'Empresa' : 'Nombres'}</h3>
                            <span class="title-desc">Datos fiscales para DTE.</span>
                        </div>
                    </div>

                    <div class="form-stack">
                        <div class="input-group">
                            <label for="first_name">{personType === 'Juridica' ? 'Nombres (Representante)' : 'Nombres'}</label>
                            <input type="text" id="first_name" placeholder="Nombre" bind:value={firstName} required />
                        </div>
                        
                        <div class="input-group">
                            <label for="last_name">{personType === 'Juridica' ? 'Apellidos (Representante)' : 'Apellidos'}</label>
                            <input type="text" id="last_name" placeholder="Apellido" bind:value={lastName} required />
                        </div>

                        {#if personType === 'Juridica'}
                            <div class="input-group fade-in">
                                <label for="business_name">Razón Social / Empresa</label>
                                <input type="text" id="business_name" placeholder="Ej. Inversiones S.A. de C.V." bind:value={businessName} required class="border-gold/30" />
                            </div>
                        {/if}

                        {#if personType === 'Juridica'}
                            <div class="grid grid-cols-2 gap-4">
                                <div class="input-group">
                                    <label for="nit">NIT</label>
                                    <input type="text" id="nit" value={nit} oninput={applyNITMask} placeholder="0000..." />
                                </div>
                                <div class="input-group">
                                    <label for="nrc">NRC</label>
                                    <input type="text" id="nrc" value={nrc} oninput={applyNRCMask} placeholder="0000..." />
                                </div>
                            </div>
                            <div class="input-group">
                                <label for="economic_activity">Giro Económico</label>
                                <textarea id="economic_activity" rows="3" placeholder="Giro de la empresa..." bind:value={economicActivity} class="luxury-textarea"></textarea>
                            </div>
                        {:else}
                             <div class="spacer-natural"></div>
                        {/if}
                    </div>
                </div>

                <!-- SECCIÓN: CONTACTO Y UBICACIÓN -->
                <div class="section-card">
                    <div class="section-title-wrapper">
                        <div class="title-content">
                            <div class="badge silver">Localización</div>
                            <h3>Contacto</h3>
                            <span class="title-desc">Ubicación y teléfonos.</span>
                        </div>
                    </div>

                    <div class="form-stack">
                        <div class="input-group profile-phone-wrapper">
                            <PhoneInput bind:value={phone} bind:isValid={isPhoneValid} label="Teléfono" />
                        </div>

                        <div class="input-group">
                            <label for="country">País</label>
                            <select id="country" bind:value={country} class="luxury-select">
                                {#each countries as c}
                                    <option value={c.isoCode}>{c.name}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="input-group">
                                <label for="department">Estado</label>
                                <select id="department" bind:value={department} disabled={!departments.length} class="luxury-select">
                                    {#each departments as d}
                                        <option value={d.isoCode}>{d.name}</option>
                                    {/each}
                                </select>
                            </div>
                            <div class="input-group">
                                <label for="municipality">Ciudad</label>
                                <select id="municipality" bind:value={municipality} disabled={!municipalities.length} class="luxury-select">
                                    {#each municipalities as m}
                                        <option value={m.name}>{m.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>
                        <div class="input-group">
                            <label for="address_complement">Dirección</label>
                            <input type="text" id="address_complement" placeholder="Dirección..." bind:value={addressComplement} />
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-refined-sm" disabled={loading}>
                    {#if loading}
                        <span class="spinner-tiny"></span> Guardando
                    {:else}
                        Actualizar Perfil
                    {/if}
                </button>
            </div>
        </form>
    </div>
</div>

<style>
	.fade-in {
		animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.luxury-profile-layout {
		max-width: 1250px;
		margin: 2rem auto 6rem;
		padding: 0 1.5rem;
		font-family: 'Inter', sans-serif;
	}

	.profile-header {
		text-align: center;
		margin-bottom: 4rem;
	}
	.profile-header h1 {
		font-family: 'Outfit', sans-serif;
		font-size: 2.75rem;
		font-weight: 300;
		color: #0f172a;
        transition: color 0.3s;
		letter-spacing: -0.02em;
		margin-bottom: 0.5rem;
	}
    :global(.dark) .profile-header h1 { color: #f8fafc; }
	.profile-header p {
		color: #64748b;
		font-size: 1.1rem;
		max-width: 500px;
        margin: 0 auto;
	}
    :global(.dark) .profile-header p { color: #94a3b8; }

    .form-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-radius: 16px;
		font-size: 0.9rem;
		font-weight: 600;
        margin-bottom: 0.5rem;
	}
	.alert-error {
		background: #fff1f2;
		color: #e11d48;
		border: 1px solid #ffe4e6;
	}
    :global(.dark) .alert-error { background: rgba(225, 29, 72, 0.1); color: #fda4af; border-color: rgba(225, 29, 72, 0.2); }
	.alert-success {
		background: #f0fdf4;
		color: #166534;
		border: 1px solid #dcfce7;
	}
    :global(.dark) .alert-success { background: rgba(22, 101, 52, 0.1); color: #86efac; border-color: rgba(22, 101, 52, 0.2); }

    .cards-layout {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        align-items: stretch;
    }

	.section-card {
		padding: 2.25rem;
		background: #ffffff;
		border: 1px solid #f1f5f9;
		border-radius: 28px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02);
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
	}
    .section-card.featured {
        background: #fcfdfe;
        border-color: #eef2f6;
    }
    :global(.dark) .section-card {
        background: #0f172a;
        border-color: rgba(30, 41, 59, 0.8);
    }
    :global(.dark) .section-card.featured {
        background: rgba(30, 41, 59, 0.4);
    }
    .section-card:hover {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05);
        border-color: #e2e8f0;
        transform: translateY(-4px);
    }
    :global(.dark) .section-card:hover { border-color: rgba(212, 175, 55, 0.2); }

	.section-title-wrapper {
		margin-bottom: 2rem;
	}
    .badge {
        display: inline-block;
        padding: 0.25rem 0.6rem;
        background: #f1f5f9;
        color: #64748b;
        font-size: 0.55rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        border-radius: 20px;
        margin-bottom: 0.75rem;
    }
    .badge.gold { background: rgba(212, 175, 55, 0.1); color: #AA8222; }
    .badge.silver { background: #f8fafc; color: #94a3b8; }
    :global(.dark) .badge { background: #1e293b; color: #94a3b8; }

	.title-content h3 {
		font-family: 'Outfit', sans-serif;
		font-size: 1.15rem;
		font-weight: 700;
		color: #0f172a;
		margin-bottom: 0.2rem;
	}
    :global(.dark) .title-content h3 { color: #f1f5f9; }
	.title-desc {
		font-size: 0.8rem;
		color: #94a3b8;
        line-height: 1.3;
        display: block;
	}

    .form-stack {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        flex: 1;
    }

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.input-group label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
		font-weight: 700;
	}
	.input-group input,
	.input-group select,
    .luxury-textarea {
		width: 100%;
		padding: 0.75rem 0.9rem;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		color: #1e293b;
		border-radius: 12px;
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s;
	}
    :global(.dark) .input-group input,
    :global(.dark) .input-group select,
    :global(.dark) .luxury-textarea {
        background: #1e293b;
        border-color: #334155;
        color: #f1f5f9;
    }
    .luxury-textarea { resize: none; }
	
	.input-group select {
		background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
		background-repeat: no-repeat;
		background-position: right 0.9rem center;
		background-size: 0.55rem auto;
	}

	.input-group input:focus,
	.input-group select:focus,
    .luxury-textarea:focus {
		outline: none;
		border-color: #D4AF37;
		box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.05);
	}

	.profile-phone-wrapper :global(.phone-input-container label) {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #94a3b8;
		font-weight: 700;
		margin-bottom: 0.5rem;
		display: block;
	}
	.profile-phone-wrapper :global(.phone-input-container > div) {
		background: #f8fafc !important;
		border: 1px solid #e2e8f0 !important;
		border-radius: 12px !important;
		height: 40px !important;
	}
    :global(.dark) .profile-phone-wrapper :global(.phone-input-container > div) {
        background: #1e293b !important;
        border-color: #334155 !important;
    }
	.profile-phone-wrapper :global(.phone-input-container input) {
		font-size: 0.85rem !important;
	}

    .spacer-natural {
        flex: 1;
        min-height: 100px;
    }

	.form-actions {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	.btn-refined-sm {
		background: #0f172a;
		color: #ffffff;
		border: none;
		padding: 0.8rem 3.5rem;
		border-radius: 14px;
		font-family: 'Outfit', sans-serif;
		font-size: 0.95rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1.5px;
		cursor: pointer;
		transition: all 0.3s ease;
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
	}
    :global(.dark) .btn-refined-sm {
        background: #D4AF37;
        color: #0f172a;
    }
	.btn-refined-sm:hover:not(:disabled) {
		background: #D4AF37;
        color: #0f172a;
		transform: translateY(-2px);
        box-shadow: 0 15px 30px rgba(212, 175, 55, 0.2);
	}
    :global(.dark) .btn-refined-sm:hover:not(:disabled) {
        background: #ffffff;
    }
	.btn-refined-sm:disabled { opacity: 0.5; }

	@media (max-width: 1100px) {
		.cards-layout { grid-template-columns: repeat(2, 1fr); }
        .luxury-profile-layout { max-width: 900px; }
	}
    @media (max-width: 768px) {
		.cards-layout { grid-template-columns: 1fr; }
        .luxury-profile-layout { max-width: 600px; }
	}
</style>
