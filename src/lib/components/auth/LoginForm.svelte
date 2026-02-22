<script lang="ts">
	import {goto} from '$app/navigation';
	import {authStore} from '$lib/stores/auth.store';
	import {validateUsername, validatePassword} from '$lib/utils/validators';
	import AuthCard from './AuthCard.svelte';
	import './LoginForm.css';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let usernameError = $state<string | null>(null);
	let passwordError = $state<string | null>(null);

	function validate(): boolean {
		usernameError = validateUsername(username);
		passwordError = validatePassword(password);
		return !usernameError && !passwordError;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = null;
		usernameError = null;
		passwordError = null;

		if (!validate()) return;

		loading = true;
		try {
			await authStore.login(username, password);
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
			<label for="login-username">Usuario</label>
			<input
				id="login-username"
				type="text"
				autocomplete="username"
				placeholder="Tu nombre de usuario"
				bind:value={username}
				disabled={loading}
				aria-invalid={!!usernameError}
				aria-describedby={usernameError ? 'login-username-error' : undefined}
			/>
			{#if usernameError}
				<span id="login-username-error" class="auth-field-error">{usernameError}</span>
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

