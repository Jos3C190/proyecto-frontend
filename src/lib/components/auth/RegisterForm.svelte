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

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let nameError = $state<string | null>(null);
	let emailError = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let passwordConfirmError = $state<string | null>(null);

	function validate(): boolean {
		// Backend: username min 3, password min 8
		nameError = validateName(name, 3);
		emailError = validateEmail(email);
		passwordError = validatePassword(password, 8);
		passwordConfirmError = validatePasswordMatch(password, passwordConfirm);
		return !nameError && !emailError && !passwordError && !passwordConfirmError;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		nameError = null;
		emailError = null;
		passwordError = null;
		passwordConfirmError = null;

		if (!validate()) return;

		loading = true;
		try {
			await authStore.register(name, email, password, passwordConfirm);
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
			<label for="register-name">Usuario</label>
			<input
				id="register-name"
				type="text"
				autocomplete="username"
				placeholder="Nombre de usuario"
				bind:value={name}
				disabled={loading}
				aria-invalid={!!nameError}
				aria-describedby={nameError ? 'register-name-error' : undefined}
			/>
			{#if nameError}
				<span id="register-name-error" class="auth-field-error">{nameError}</span>
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
