<script lang="ts">
	import {authStore} from '$lib/stores/auth.store';
	import { getDisplayName } from '$lib/types';
	import './dashboardPage.css';
</script>

<div class="dashboard">
	<h1 class="dashboard-title">Dashboard</h1>
	<p class="dashboard-welcome">
		Hola, <strong>{getDisplayName($authStore.user)}</strong>. Has iniciado sesión correctamente.
	</p>
	<p class="dashboard-hint">
		VACIO
	</p>
</div>


