<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import { validateEmail, validatePassword } from '$lib/utils/validators';

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
			const params = new URLSearchParams(window.location.search);
			let red = params.get('redirect');
			if (!red) {
				red = hasPermission($authStore.user, 'dashboard', 'read') ? '/dashboard' : '/profile/reservations';
			}
			goto(red, { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al iniciar sesión';
		} finally {
			loading = false;
		}
	}
</script>

<div class="luxury-auth-layout">
	<!-- Panel de Imagen -->
	<div class="auth-image-panel">
		<div class="image-overlay"></div>
		<div class="image-content">
			<a href="/" class="brand-link">
				<span class="brand-accent">AFE</span> Resort
			</a>
			<div class="quote-box">
				<h3>"Tranquilidad y exclusividad en cada latido."</h3>
				<p>- La experiencia integral del resort.</p>
			</div>
		</div>
	</div>

	<!-- Panel del Formulario -->
	<div class="auth-form-panel">
		<div class="auth-form-container">
			<!-- Header Móvil -->
			<a href="/" class="brand-link-mobile">
				<span class="brand-accent">AFE</span> Resort
			</a>

			<div class="form-header">
				<h1>Bienvenido de nuevo</h1>
				<p>Inicia sesión para continuar tu reserva o gestionar tu estancia.</p>
			</div>

			<form class="luxe-form" onsubmit={handleSubmit}>
				{#if error}
					<div class="alert-error" role="alert">{error}</div>
				{/if}

				<div class="input-group">
					<label for="login-email">Correo Electrónico</label>
					<input
						id="login-email"
						type="email"
						placeholder="ejemplo@correo.com"
						bind:value={email}
						disabled={loading}
						class:invalid={!!emailError}
					/>
					{#if emailError}<span class="field-error">{emailError}</span>{/if}
				</div>

				<div class="input-group">
					<label for="login-password">Contraseña</label>
					<input
						id="login-password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						disabled={loading}
						class:invalid={!!passwordError}
					/>
					{#if passwordError}<span class="field-error">{passwordError}</span>{/if}
				</div>

				<div class="form-actions">
					<a href="#" class="forgot-link">¿Olvidaste tu contraseña?</a>
				</div>

				<button type="submit" class="btn-gold-solid" disabled={loading}>
					{#if loading}
						<span class="spinner"></span> Validando...
					{:else}
						Iniciar Sesión
					{/if}
				</button>
			</form>

			<div class="form-footer">
				<p>¿No tienes una cuenta aún? <a href="/register" class="text-gold">Regístrate aquí</a></p>
			</div>
		</div>
	</div>
</div>

<style>
	/* Global Resets for Auth Page injected implicitly */
	:global(body) { margin: 0; padding: 0; background: var(--bg-main, #0B0E14); }
	
	.luxury-auth-layout {
		display: flex;
		min-height: 100vh;
		width: 100vw;
		background: var(--bg-main, #0B0E14);
		font-family: 'Inter', sans-serif;
		/* Fuerza el renderizado por hardware para evitar lag visual */
		transform: translateZ(0);
		will-change: transform;
	}

	/* Imagen Izquierda */
	.auth-image-panel {
		flex: 1.2;
		position: relative;
		background-image: url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80');
		background-size: cover;
		background-position: center;
		display: none; /* Oculto en móvil */
	}
	@media (min-width: 1024px) {
		.auth-image-panel { display: block; }
	}
	.image-overlay {
		position: absolute; inset: 0;
		background: linear-gradient(to bottom, rgba(11, 14, 20, 0.4), rgba(11, 14, 20, 0.8));
	}
	.image-content {
		position: absolute; inset: 0;
		padding: 3rem;
		display: flex; flex-direction: column; justify-content: space-between;
		color: white; z-index: 10;
	}
	.brand-link { font-family: 'Outfit'; font-size: 2rem; font-weight: 300; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; color: white; }
	.brand-accent { font-weight: 800; color: #D4AF37; }
	
	.quote-box h3 { font-family: 'Outfit'; font-size: 2.5rem; font-weight: 300; line-height: 1.2; margin-bottom: 1rem; }
	.quote-box p { font-size: 1.1rem; color: rgba(255,255,255,0.7); }

	/* Formulario Derecha */
	.auth-form-panel {
		flex: 1;
		display: flex; align-items: center; justify-content: center;
		padding: 2rem;
		background: var(--bg-main);
	}
	.auth-form-container {
		width: 100%; max-width: 440px;
	}
	
	.brand-link-mobile {
		display: block; font-family: 'Outfit'; font-size: 1.8rem; font-weight: 300; text-transform: uppercase; letter-spacing: 2px; text-decoration: none; color: var(--text-main); text-align: center; margin-bottom: 3rem;
	}
	@media (min-width: 1024px) { .brand-link-mobile { display: none; } }

	.form-header { margin-bottom: 2.5rem; text-align: left; }
	.form-header h1 { font-family: 'Outfit'; font-size: 2.5rem; font-weight: 400; color: var(--text-main); margin-bottom: 0.5rem; }
	.form-header p { color: var(--text-muted); font-size: 1rem; line-height: 1.5; }

	.luxe-form { display: flex; flex-direction: column; gap: 1.5rem; }
	
	.alert-error { background: rgba(220, 38, 38, 0.1); border-left: 4px solid #dc2626; color: #ef4444; padding: 1rem; border-radius: 4px; font-size: 0.9rem; }

	.input-group label { display: block; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: 0.75rem; font-weight: 700; }
	.input-group input { 
		width: 100%; padding: 1.1rem 1.2rem; background: var(--bg-alt); border: 1px solid var(--border-light); color: var(--text-main); border-radius: 12px; font-family: inherit; font-size: 1rem; transition: all 0.3s;
	}
	.input-group input:focus { outline: none; border-color: #D4AF37; box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.15); }
	.input-group input.invalid { border-color: #ef4444; }
	.field-error { display: block; color: #ef4444; font-size: 0.8rem; margin-top: 0.5rem; }

	.form-actions { display: flex; justify-content: flex-end; }
	.forgot-link { color: var(--text-muted); font-size: 0.85rem; text-decoration: none; transition: color 0.3s; }
	.forgot-link:hover { color: #D4AF37; }

	.btn-gold-solid {
		width: 100%; background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%); color: #0B0E14; border: none; padding: 1.2rem; border-radius: 8px; font-family: 'Outfit'; font-size: 1.1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; transition: all 0.3s; margin-top: 1rem;
		display: flex; justify-content: center; align-items: center; gap: 0.5rem;
	}
	.btn-gold-solid:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(212, 175, 55, 0.3); }
	.btn-gold-solid:disabled { opacity: 0.7; cursor: not-allowed; }

	.form-footer { margin-top: 2rem; text-align: center; color: var(--text-muted); font-size: 0.9rem; }
	.text-gold { color: #D4AF37; text-decoration: none; font-weight: 600; transition: color 0.3s; }
	.text-gold:hover { color: #efcd5c; }

	.spinner { width: 20px; height: 20px; border: 2px solid rgba(11,14,20,0.3); border-top-color: #0B0E14; border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
