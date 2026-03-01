<script lang="ts">
	import {goto} from '$app/navigation';
	import {authStore } from '$lib/stores/auth.store';
	import {
		validateEmail,
		validatePassword,
		validatePasswordMatch,
		validateName
	} from '$lib/utils/validators';
	import AuthCard from './AuthCard.svelte';
	import './RegisterForm.css';

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let firstNameError = $state<string | null>(null);
	let lastNameError = $state<string | null>(null);
	let emailError = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let passwordConfirmError = $state<string | null>(null);

	function validate(): boolean {
		// Backend: first_name/last_name min 1, password min 8
		firstNameError = validateName(firstName, 1);
		lastNameError = validateName(lastName, 1);
		emailError = validateEmail(email);
		passwordError = validatePassword(password, 8);
		passwordConfirmError = validatePasswordMatch(password, passwordConfirm);
		return !firstNameError && !lastNameError && !emailError && !passwordError && !passwordConfirmError;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		firstNameError = null;
		lastNameError = null;
		emailError = null;
		passwordError = null;
		passwordConfirmError = null;

		if (!validate()) return;

		loading = true;
		try {
			await authStore.register(firstName, lastName, email, password, passwordConfirm);
			goto('/dashboard', { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al registrarse';
		} finally {
			loading = false;
		}
	}
</script>

<AuthCard>
	<h1 class="auth-title">Crear cuenta</h1>
	<p class="auth-subtitle">Regístrate para continuar</p>

	<form class="auth-form" onsubmit={handleSubmit}>
		{#if error}
			<div class="auth-error" role="alert">{error}</div>
		{/if}

		<div class="auth-field">
			<label for="register-first-name">Nombre</label>
			<input
				id="register-first-name"
				type="text"
				autocomplete="given-name"
				placeholder="Tu nombre"
				bind:value={firstName}
				disabled={loading}
				aria-invalid={!!firstNameError}
				aria-describedby={firstNameError ? 'register-first-name-error' : undefined}
			/>
			{#if firstNameError}
				<span id="register-first-name-error" class="auth-field-error">{firstNameError}</span>
			{/if}
		</div>

		<div class="auth-field">
			<label for="register-last-name">Apellido</label>
			<input
				id="register-last-name"
				type="text"
				autocomplete="family-name"
				placeholder="Tu apellido"
				bind:value={lastName}
				disabled={loading}
				aria-invalid={!!lastNameError}
				aria-describedby={lastNameError ? 'register-last-name-error' : undefined}
			/>
			{#if lastNameError}
				<span id="register-last-name-error" class="auth-field-error">{lastNameError}</span>
			{/if}
		</div>

		<div class="auth-field">
			<label for="register-email">Email</label>
			<input
				id="register-email"
				type="email"
				autocomplete="email"
				placeholder="tu@email.com"
				bind:value={email}
				disabled={loading}
				aria-invalid={!!emailError}
				aria-describedby={emailError ? 'register-email-error' : undefined}
			/>
			{#if emailError}
				<span id="register-email-error" class="auth-field-error">{emailError}</span>
			{/if}
		</div>

		<div class="auth-field">
			<label for="register-password">Contraseña</label>
			<input
				id="register-password"
				type="password"
				autocomplete="new-password"
				placeholder="Mínimo 8 caracteres"
				bind:value={password}
				disabled={loading}
				aria-invalid={!!passwordError}
				aria-describedby={passwordError ? 'register-password-error' : undefined}
			/>
			{#if passwordError}
				<span id="register-password-error" class="auth-field-error">{passwordError}</span>
			{/if}
		</div>

		<div class="auth-field">
			<label for="register-password-confirm">Confirmar contraseña</label>
			<input
				id="register-password-confirm"
				type="password"
				autocomplete="new-password"
				placeholder="Repite la contraseña"
				bind:value={passwordConfirm}
				disabled={loading}
				aria-invalid={!!passwordConfirmError}
				aria-describedby={passwordConfirmError ? 'register-password-confirm-error' : undefined}
			/>
			{#if passwordConfirmError}
				<span id="register-password-confirm-error" class="auth-field-error"
					>{passwordConfirmError}</span
				>
			{/if}
		</div>

		<button type="submit" class="auth-submit" disabled={loading}>
			{#if loading}
				<span class="auth-spinner" aria-hidden="true"></span>
				Creando cuenta...
			{:else}
				Registrarse
			{/if}
		</button>
	</form>

	<p class="auth-footer">
		¿Ya tienes cuenta?
		<a href="/login" class="auth-link">Inicia sesión</a>
	</p>
</AuthCard>
