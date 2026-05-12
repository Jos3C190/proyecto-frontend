<script lang="ts">
	import { fade } from 'svelte/transition';
	import {
		notifications,
		unreadCount,
		notificationActions
	} from '$lib/stores/notification.store';

	let filter = $state<'all' | 'unread'>('all');
	
	let filteredNotifications = $derived(
		filter === 'unread' ? $notifications.filter(n => !n.is_read) : $notifications
	);

	function markAllAsRead() {
		notificationActions.markAllAsRead();
	}

	function markAsRead(id: number) {
		notificationActions.markAsRead(id);
	}

	function deleteNotification(id: number) {
		notificationActions.deleteNotification(id);
	}

	function getTypeIcon(type: string) {
		switch (type) {
			case 'success': return 'M5 13l4 4L19 7'; // check
			case 'warning': return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'; // warning
			case 'alert': return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // error/alert
			case 'info': default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // info
		}
	}

	function formatDateTime(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('es-ES', { 
			day: 'numeric', 
			month: 'short', 
			year: 'numeric' 
		});
	}

	function timeAgo(dateStr: string): string {
		const now = new Date();
		const date = new Date(dateStr);
		const diffMs = now.getTime() - date.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'Ahora';
		if (diffMin < 60) return `Hace ${diffMin} min`;
		const diffHours = Math.floor(diffMin / 60);
		if (diffHours < 24) return `Hace ${diffHours}h`;
		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 30) return `Hace ${diffDays}d`;
		return `Hace ${Math.floor(diffDays / 30)} mes(es)`;
	}
</script>

<svelte:head>
	<title>Mis Notificaciones - AFE Resort</title>
</svelte:head>

<div class="notifications-page fade-in">
	<div class="page-header">
		<div>
			<h1 class="page-title">Centro de Notificaciones</h1>
			<p class="page-subtitle">Mantente al tanto de tus reservas, ofertas y avisos importantes.</p>
		</div>
		{#if $unreadCount > 0}
			<button class="btn-mark-all" onclick={markAllAsRead}>
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/></svg>
				Marcar todas leídas
			</button>
		{/if}
	</div>

	<div class="filter-tabs">
		<button 
			class="filter-tab {filter === 'all' ? 'active' : ''}"
			onclick={() => filter = 'all'}
		>
			Todas
		</button>
		<button 
			class="filter-tab {filter === 'unread' ? 'active' : ''}"
			onclick={() => filter = 'unread'}
		>
			No leídas
			{#if $unreadCount > 0}
				<span class="badge">{$unreadCount}</span>
			{/if}
		</button>
	</div>

	<div class="notifications-list">
		{#if filteredNotifications.length === 0}
			<div class="empty-state">
				<div class="empty-icon-wrapper">
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3zm-8.27 4a2 2 0 0 1-3.46 0"/></svg>
				</div>
				<h2>No hay notificaciones</h2>
				<p>No tienes notificaciones {filter === 'unread' ? 'sin leer' : ''} en este momento.</p>
			</div>
		{:else}
			{#each filteredNotifications as notification (notification.id)}
				<div class="notification-card" class:unread={!notification.is_read} transition:fade>
					<div class="card-icon {notification.severity}">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
							<path d={getTypeIcon(notification.severity)}></path>
						</svg>
					</div>
					<div class="card-content">
						<div class="card-header">
							<h3 class="card-title">{notification.title}</h3>
							<span class="card-date">{formatDateTime(notification.created_at)} &middot; {timeAgo(notification.created_at)}</span>
						</div>
						<p class="card-message">{notification.message}</p>
					</div>
					<div class="card-actions">
						{#if !notification.is_read}
							<button class="btn-action" onclick={() => markAsRead(notification.id)} title="Marcar como leída">
								<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
							</button>
						{/if}
						<button class="btn-action danger" onclick={() => deleteNotification(notification.id)} title="Eliminar">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.notifications-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1rem;
		font-family: 'Inter', sans-serif;
	}

	.fade-in {
		animation: fadeIn 0.4s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		margin-bottom: 2rem;
	}

	.page-title {
		font-family: 'Outfit', sans-serif;
		font-size: 2rem;
		font-weight: 700;
		color: #0f172a;
		margin: 0;
	}

	:global(html.dark) .page-title {
		color: #fff;
	}

	.page-subtitle {
		color: #64748b;
		margin: 0.5rem 0 0;
	}

	:global(html.dark) .page-subtitle {
		color: #94a3b8;
	}

	.btn-mark-all {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(212, 175, 55, 0.1);
		color: #D4AF37;
		border: 1px solid rgba(212, 175, 55, 0.2);
		padding: 0.5rem 1rem;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-mark-all:hover {
		background: rgba(212, 175, 55, 0.2);
		border-color: rgba(212, 175, 55, 0.4);
	}

	.filter-tabs {
		display: flex;
		gap: 1rem;
		border-bottom: 1px solid rgba(0,0,0,0.1);
		margin-bottom: 1.5rem;
	}

	:global(html.dark) .filter-tabs {
		border-bottom-color: rgba(255,255,255,0.1);
	}

	.filter-tab {
		background: transparent;
		border: none;
		padding: 0.75rem 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: #64748b;
		cursor: pointer;
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	:global(html.dark) .filter-tab {
		color: #94a3b8;
	}

	.filter-tab.active {
		color: #D4AF37;
	}

	.filter-tab.active::after {
		content: '';
		position: absolute;
		bottom: -1px;
		left: 0;
		right: 0;
		height: 2px;
		background: #D4AF37;
		border-radius: 2px 2px 0 0;
	}

	.badge {
		background: #ef4444;
		color: white;
		font-size: 0.65rem;
		padding: 2px 6px;
		border-radius: 10px;
	}

	.notifications-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.notification-card {
		display: flex;
		gap: 1.5rem;
		background: white;
		border: 1px solid rgba(0,0,0,0.05);
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
		transition: transform 0.2s, box-shadow 0.2s;
	}

	:global(html.dark) .notification-card {
		background: #11151d;
		border-color: rgba(255,255,255,0.05);
		box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);
	}

	.notification-card:hover {
		box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
		transform: translateY(-2px);
	}

	:global(html.dark) .notification-card:hover {
		box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
	}

	.notification-card.unread {
		border-left: 4px solid #D4AF37;
		background: rgba(212, 175, 55, 0.02);
	}

	:global(html.dark) .notification-card.unread {
		background: rgba(212, 175, 55, 0.05);
	}

	.card-icon {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.card-icon.info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
	.card-icon.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
	.card-icon.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
	.card-icon.alert { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

	.card-content {
		flex: 1;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 0.5rem;
	}

	.card-title {
		font-weight: 700;
		font-size: 1.1rem;
		color: #0f172a;
		margin: 0;
	}

	:global(html.dark) .card-title {
		color: #e2e8f0;
	}

	.card-date {
		font-size: 0.8rem;
		color: #94a3b8;
	}

	.card-message {
		color: #475569;
		line-height: 1.6;
		margin: 0;
	}

	:global(html.dark) .card-message {
		color: #94a3b8;
	}

	.card-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.btn-action {
		background: transparent;
		border: none;
		color: #94a3b8;
		padding: 0.5rem;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-action:hover {
		background: rgba(0,0,0,0.05);
		color: #D4AF37;
	}

	:global(html.dark) .btn-action:hover {
		background: rgba(255,255,255,0.05);
	}

	.btn-action.danger:hover {
		color: #ef4444;
	}

	.empty-state {
		text-align: center;
		padding: 5rem 2rem;
		background: white;
		border-radius: 12px;
		border: 1px dashed rgba(0,0,0,0.1);
	}

	:global(html.dark) .empty-state {
		background: #11151d;
		border-color: rgba(255,255,255,0.1);
	}

	.empty-icon-wrapper {
		width: 80px;
		height: 80px;
		background: rgba(0,0,0,0.02);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto 1.5rem;
		color: #cbd5e1;
	}

	:global(html.dark) .empty-icon-wrapper {
		background: rgba(255,255,255,0.02);
		color: #475569;
	}

	.empty-state h2 {
		font-family: 'Outfit', sans-serif;
		font-size: 1.5rem;
		color: #0f172a;
		margin: 0 0 0.5rem;
	}

	:global(html.dark) .empty-state h2 {
		color: #fff;
	}

	.empty-state p {
		color: #64748b;
		margin: 0;
	}

	:global(html.dark) .empty-state p {
		color: #94a3b8;
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.notification-card {
			flex-direction: column;
			gap: 1rem;
		}

		.card-header {
			flex-direction: column;
			gap: 0.25rem;
		}

		.card-actions {
			flex-direction: row;
			justify-content: flex-end;
			border-top: 1px solid rgba(0,0,0,0.05);
			padding-top: 1rem;
			margin-top: 0.5rem;
		}

		:global(html.dark) .card-actions {
			border-top-color: rgba(255,255,255,0.05);
		}
	}
</style>
