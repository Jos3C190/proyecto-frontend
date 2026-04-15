<script lang="ts">
	import { getMyReservations } from '$lib/services/reservation.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import { onMount } from 'svelte';

	let reservations = $state<ReservationRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			reservations = await getMyReservations();
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	});
</script>

<svelte:head>
	<title>Mis Reservaciones | AFE Resort</title>
</svelte:head>

<div class="luxury-reservations-layout fade-in">
	<div class="page-header">
		<h1>Mis Reservaciones</h1>
		<p>Historial y gestión de tus estadías en AFE Resort.</p>
	</div>

	<!-- Contenido oculto temporalmente por solicitud -->
	{#if false}
	{#if loading}
		<div class="loader-container">
			<div class="spinner-large"></div>
		</div>
	{:else if error}
		<div class="alert alert-error">
			<span class="icon">⚠️</span> {error}
		</div>
	{:else if reservations.length === 0}
		<div class="empty-state glass-card">
			<div class="empty-icon">🧳</div>
			<h3>Aún no tienes reservaciones</h3>
			<p>Tu próxima escapada lujosa te está esperando.</p>
			<a href="/rooms" class="btn-gold-solid">Explorar Habitaciones</a>
		</div>
	{:else}
		<div class="reservations-grid">
			{#each reservations as res}
				<div class="reservation-card glass-card">
					<div class="card-header">
						<span class="res-id">Reserva #{res.unique_id.split('-')[0].toUpperCase()}</span>
						<span class="status badge-{res.status.toLowerCase()}">{res.status}</span>
					</div>
					
					<div class="room-details">
						<div class="room-img-placeholder">
							{#if res.room?.images && res.room.images.length > 0}
								<img src={res.room.images[0].url} alt={res.room.type} />
							{:else}
								<img src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="Room" />
							{/if}
						</div>
						<div class="room-info">
							<h3>{res.room?.type} Room</h3>
							<p>Habitación No. {res.room?.number}</p>
							<div class="dates-row">
								<div class="date-block">
									<small>Check-in</small>
									<span>{res.check_in}</span>
								</div>
								<div class="date-separator">→</div>
								<div class="date-block">
									<small>Check-out</small>
									<span>{res.check_out}</span>
								</div>
							</div>
						</div>
					</div>

					<div class="card-footer">
						<div class="price-info">
							<small>Costo Total</small>
							<span class="total-price">${res.total_cost}</span>
						</div>
						{#if (res.balance || 0) > 0}
							<div class="price-info balance-info">
								<small class="text-red-500 font-bold">Saldo Pendiente</small>
								<span class="total-price text-red-500">${res.balance}</span>
							</div>
						{:else if (res.balance || 0) < 0}
							<div class="price-info balance-info">
								<small class="text-indigo-500 font-bold">Saldo a Favor</small>
								<span class="total-price text-indigo-500">${Math.abs(res.balance!)}</span>
							</div>
						{/if}
						<a href="/reservations/summary/{res.id}" class="btn-outline-gold">Ver Detalles</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}
	{/if}
</div>

<style>
	.fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(20px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.luxury-reservations-layout {
		max-width: 1100px;
		margin: 2rem auto 5rem;
		padding: 0 1.5rem;
		font-family: 'Inter', sans-serif;
	}

	.page-header {
		text-align: center;
		margin-bottom: 4rem;
	}
	.page-header h1 {
		font-family: 'Outfit', sans-serif;
		font-size: 2.5rem;
		font-weight: 300;
		color: var(--text-main);
		margin-bottom: 0.5rem;
	}
	.page-header p {
		color: var(--text-muted);
		font-size: 1.1rem;
	}

	.glass-card {
		background: var(--bg-alt);
		border: 1px solid var(--border-light);
		border-radius: 12px;
		box-shadow: 0 10px 30px rgba(0,0,0,0.05);
		overflow: hidden;
		transition: transform 0.3s, box-shadow 0.3s;
	}

	.loader-container { display: flex; justify-content: center; padding: 4rem; }
	.spinner-large { width: 50px; height: 50px; border: 3px solid rgba(212, 175, 55, 0.3); border-top-color: #D4AF37; border-radius: 50%; animation: spin 0.8s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.alert { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 2rem; font-weight: 500; }
	.alert-error { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-left: 4px solid #ef4444; }

	.empty-state {
		text-align: center;
		padding: 5rem 2rem;
	}
	.empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
	.empty-state h3 { font-family: 'Outfit'; font-size: 1.5rem; color: var(--text-main); margin-bottom: 0.5rem; }
	.empty-state p { color: var(--text-muted); margin-bottom: 2rem; }

	.btn-gold-solid {
		background: linear-gradient(135deg, #D4AF37 0%, #AA8222 100%);
		color: #0B0E14; border: none; padding: 1rem 2.5rem; border-radius: 8px; font-family: 'Outfit'; font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.3s;
	}
	.btn-gold-solid:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(212, 175, 55, 0.3); }

	.reservations-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
		gap: 2rem;
	}

	.reservation-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 20px 40px rgba(0,0,0,0.1);
		border-color: rgba(212, 175, 55, 0.3);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid var(--border-light);
		background: rgba(0,0,0,0.02);
	}
	.res-id { font-family: 'Outfit'; font-weight: 700; color: var(--text-muted); font-size: 0.9rem; letter-spacing: 1px; }
	
	.status {
		padding: 0.4rem 1rem;
		border-radius: 50px;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
	}
	.badge-pending { background: rgba(234, 179, 8, 0.15); color: #ca8a04; border: 1px solid rgba(202, 138, 4, 0.3); }
	.badge-confirmed { background: rgba(34, 197, 94, 0.15); color: #16a34a; border: 1px solid rgba(22, 163, 74, 0.3); }
	.badge-cancelled { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

	.room-details {
		display: flex;
		padding: 1.5rem;
		gap: 1.5rem;
	}
	.room-img-placeholder {
		width: 120px;
		height: 120px;
		border-radius: 8px;
		overflow: hidden;
		flex-shrink: 0;
	}
	.room-img-placeholder img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	
	.room-info { flex: 1; }
	.room-info h3 { font-family: 'Outfit'; font-size: 1.25rem; font-weight: 500; color: var(--text-main); margin: 0 0 0.25rem; }
	.room-info p { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
	
	.dates-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(0,0,0,0.02);
		padding: 0.75rem 1rem;
		border-radius: 6px;
		border: 1px solid var(--border-light);
	}
	.date-block { display: flex; flex-direction: column; }
	.date-block small { font-size: 0.7rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 0.2rem; }
	.date-block span { font-weight: 600; font-size: 0.9rem; color: var(--text-main); }
	.date-separator { color: #D4AF37; font-weight: bold; }

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-top: 1px solid var(--border-light);
	}
	.price-info { display: flex; flex-direction: column; }
	.price-info small { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); letter-spacing: 1px; }
	.total-price { font-family: 'Outfit'; font-size: 1.5rem; font-weight: 700; color: #D4AF37; }

	.btn-outline-gold {
		border: 1px solid #D4AF37;
		color: var(--text-main);
		padding: 0.6rem 1.5rem;
		border-radius: 4px;
		font-family: 'Outfit';
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 1px;
		text-decoration: none;
		transition: all 0.3s;
	}
	.btn-outline-gold:hover {
		background: rgba(212, 175, 55, 0.1);
	}

	@media (max-width: 768px) {
		.reservations-grid { grid-template-columns: 1fr; }
		.room-details { flex-direction: column; }
		.room-img-placeholder { width: 100%; height: 200px; }
	}
</style>
