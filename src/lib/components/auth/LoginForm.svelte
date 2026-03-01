<script lang="ts">
	import {goto} from '$app/navigation';
	import {authStore} from '$lib/stores/auth.store';
	import {validateEmail, validatePassword} from '$lib/utils/validators';
	import AuthCard from './AuthCard.svelte';
	import './LoginForm.css';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let emailError = $state<string | null>(null);
	let passwordError = $state<string | null>(null);

	function validate(): boolean {
		emailError = validateEmail(email);
		passwordError = validatePassword(password, 8);
		return !emailError && !passwordError;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		emailError = null;
		passwordError = null;

		if (!validate()) return;

		loading = true;
		try {
			await authStore.login(email, password);
			goto('/dashboard', { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al iniciar sesión';
		} finally {
			loading = false;
		}
	}
</script>

<AuthCard>
	<h1 class="auth-title">Iniciar sesión</h1>
	<p class="auth-subtitle">Accede a tu cuenta</p>

	<form class="auth-form" onsubmit={handleSubmit}>
		{#if error}
			<div class="auth-error" role="alert">{error}</div>
		{/if}

		<div class="auth-field">
			<label for="login-email">Email</label>
			<input
				id="login-email"
				type="email"
				autocomplete="email"
				placeholder="tu@email.com"
				bind:value={email}
				disabled={loading}
				aria-invalid={!!emailError}
				aria-describedby={emailError ? 'login-email-error' : undefined}
			/>
			{#if emailError}
				<span id="login-email-error" class="auth-field-error">{emailError}</span>
			{/if}
		</div>

		<div class="auth-field">
			<label for="login-password">Contraseña</label>
			<input
				id="login-password"
				type="password"
				autocomplete="current-password"
				placeholder="••••••••"
				bind:value={password}
				disabled={loading}
				aria-invalid={!!passwordError}
				aria-describedby={passwordError ? 'login-password-error' : undefined}
			/>
			{#if passwordError}
				<span id="login-password-error" class="auth-field-error">{passwordError}</span>
			{/if}
		</div>

		<button type="submit" class="auth-submit" disabled={loading}>
			{#if loading}
				<span class="auth-spinner" aria-hidden="true"></span>
				Iniciando sesión...
			{:else}
				Entrar
			{/if}
		</button>
	</form>

	<p class="auth-footer">
		¿No tienes cuenta?
		<a href="/register" class="auth-link">Regístrate</a>
	</p>
</AuthCard>
