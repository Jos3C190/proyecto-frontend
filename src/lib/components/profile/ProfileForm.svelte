<script lang="ts">	
	import { authStore } from '$lib/stores/auth.store';
	import { updateProfile, getMyProfile } from '$lib/services/user.service';
	import { Country, State, City } from 'country-state-city';
	import { onMount } from 'svelte';

	let loading = $state(false);
	let successMsg = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	// Inicializar con datos actuales del store
	let firstName = $state($authStore.user?.profile?.first_name || '');
	let lastName = $state($authStore.user?.profile?.last_name || '');
	let phone = $state($authStore.user?.profile?.phone || '');
	let dateOfBirth = $state($authStore.user?.profile?.date_of_birth || '');
	let country = $state($authStore.user?.profile?.country || 'SV');
	let department = $state($authStore.user?.profile?.department || '');
	let municipality = $state($authStore.user?.profile?.municipality || '');
	let addressComplement = $state($authStore.user?.profile?.address_complement || '');

	onMount(async () => {
		try {
			const freshUser = await getMyProfile();
			firstName = freshUser.profile?.first_name || '';
			lastName = freshUser.profile?.last_name || '';
			phone = freshUser.profile?.phone || '';
			dateOfBirth = freshUser.profile?.date_of_birth || '';
			country = freshUser.profile?.country || 'SV';
			department = freshUser.profile?.department || '';
			municipality = freshUser.profile?.municipality || '';
			addressComplement = freshUser.profile?.address_complement || '';
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
		return d.toISOString().split('T')[0];
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMsg = null;
		successMsg = null;
		loading = true;

		try {
			await updateProfile({
				first_name: firstName.trim() || null,
				last_name: lastName.trim() || null,
				phone: phone.trim() || null,
				date_of_birth: dateOfBirth || null,
				country: country || null,
				department: department || null,
				municipality: municipality || null,
				address_complement: addressComplement.trim() || null
			});
			successMsg = 'Perfil actualizado correctamente.';
		} catch (err: any) {
			errorMsg = err.message || 'Error al actualizar.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="luxury-profile-layout fade-in">
	<div class="profile-header">
		<h1>Mi Perfil</h1>
		<p>Gestiona tu información personal e historial con AFE Resort.</p>
	</div>
	
	<div class="profile-card glass-card">
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
			<div class="form-grid">
				<div class="input-group">
					<label for="first_name">Nombre</label>
					<input type="text" id="first_name" placeholder="Tu nombre" bind:value={firstName} required />
				</div>
				<div class="input-group">
					<label for="last_name">Apellido</label>
					<input type="text" id="last_name" placeholder="Tu apellido" bind:value={lastName} required />
				</div>
				<div class="input-group">
					<label for="phone">Teléfono de Contacto</label>
					<input type="tel" id="phone" placeholder="+503 1234 5678" bind:value={phone} />
				</div>
				<div class="input-group">
					<label for="dob">Fecha de Nacimiento (+18)</label>
					<input type="date" id="dob" bind:value={dateOfBirth} max={maxDobString} />
				</div>
				<div class="input-group">
					<label for="country">País</label>
					<select id="country" bind:value={country} class="luxury-select">
						<option value="">-- Seleccionar --</option>
						{#each countries as c}
							<option value={c.isoCode}>{c.name}</option>
						{/each}
					</select>
				</div>
				<div class="input-group">
					<label for="department">Departamento</label>
					<select id="department" bind:value={department} disabled={!departments.length} class="luxury-select">
						<option value="">-- Seleccionar --</option>
						{#each departments as d}
							<option value={d.isoCode}>{d.name}</option>
						{/each}
					</select>
				</div>
				<div class="input-group">
					<label for="municipality">Municipio</label>
					<select id="municipality" bind:value={municipality} disabled={!municipalities.length} class="luxury-select">
						<option value="">-- Seleccionar --</option>
						{#each municipalities as m}
							<option value={m.name}>{m.name}</option>
						{/each}
					</select>
				</div>
				<div class="input-group">
					<label for="address_complement">Complemento de Dirección</label>
					<input type="text" id="address_complement" placeholder="Colonia, # Casa..." bind:value={addressComplement} />
				</div>
			</div>
			
			<div class="form-actions">
				<button type="submit" class="btn-gold-solid" disabled={loading}>
					{#if loading}
						<span class="spinner"></span> Guardando
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
		animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.luxury-profile-layout {
		max-width: 800px;
		margin: 2rem auto 4rem;
		padding: 0 1.5rem;
		font-family: 'Inter', sans-serif;
	}

	.profile-header {
		text-align: center;
		margin-bottom: 3rem;
	}
	.profile-header h1 {
		font-family: 'Outfit', sans-serif;
		font-size: 2.5rem;
		font-weight: 300;
		color: var(--text-main, #0f172a);
		margin-bottom: 0.5rem;
	}
	.profile-header p {
		color: var(--text-muted, #64748b);
		font-size: 1.1rem;
	}

	.glass-card {
		background: var(--bg-alt, #ffffff);
		border: 1px solid var(--border-light, rgba(0,0,0,0.1));
		border-radius: 12px;
		padding: 3rem;
		box-shadow: 0 20px 40px rgba(0,0,0,0.05);
	}

	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-radius: 8px;
		margin-bottom: 2rem;
		font-size: 0.95rem;
		font-weight: 500;
	}
	.alert-error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border-left: 4px solid #ef4444;
	}
	.alert-success {
		background: rgba(16, 185, 129, 0.1);
		color: #10b981;
		border-left: 4px solid #10b981;
	}

	.luxury-form {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem 2rem;
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.input-group label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: var(--text-muted);
		font-weight: 600;
	}
	.input-group input,
	.input-group select {
		width: 100%;
		padding: 1rem;
		background: var(--bg-main);
		border: 1px solid var(--border-light);
		color: var(--text-main);
		border-radius: 8px;
		font-family: inherit;
		font-size: 1rem;
		transition: all 0.3s;
		appearance: none;
	}
	.input-group select {
		background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
		background-repeat: no-repeat;
		background-position: right 1rem top 50%;
		background-size: 0.65rem auto;
	}
	.input-group select option {
		background: var(--bg-alt);
		color: var(--text-main);
	}
	.input-group input:focus,
	.input-group select:focus {
		outline: none;
		border-color: #D4AF37;
		background-color: rgba(212, 175, 55, 0.02);
		box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 1rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-light);
	}

	.btn-gold-solid {
		background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%);
		color: #0B0E14;
		border: none;
		padding: 1rem 2.5rem;
		border-radius: 8px;
		font-family: 'Outfit';
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 2px;
		cursor: pointer;
		transition: all 0.3s;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.btn-gold-solid:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(212, 175, 55, 0.3);
	}
	.btn-gold-solid:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(11,14,20,0.3);
		border-top-color: #0B0E14;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	@media (max-width: 768px) {
		.form-grid { grid-template-columns: 1fr; }
		.glass-card { padding: 2rem 1.5rem; }
		.profile-header h1 { font-size: 2rem; }
	}
</style>
