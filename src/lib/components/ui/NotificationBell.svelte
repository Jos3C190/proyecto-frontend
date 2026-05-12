<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import {
		notifications,
		unreadCount,
		notificationActions
	} from '$lib/stores/notification.store';

	let isOpen = $state(false);

	function toggleDropdown() {
		isOpen = !isOpen;
	}

	function handleMarkAllAsRead() {
		notificationActions.markAllAsRead();
	}

	function handleMarkAsRead(id: number) {
		notificationActions.markAsRead(id);
	}

	function clickOutside(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
				isOpen = false;
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	function getTypeIcon(type: string): string {
		switch (type) {
			case 'success': return 'M5 13l4 4L19 7';
			case 'warning': return 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z';
			case 'alert': return 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
			case 'info': default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
		}
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

<div class="notification-wrapper" use:clickOutside>
	<button 
		class="btn-bell" 
		class:active={isOpen}
		onclick={toggleDropdown} 
		aria-expanded={isOpen}
		aria-label="Notificaciones"
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
			<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
		</svg>
		
		{#if $unreadCount > 0}
			<span class="notification-badge" transition:fade={{ duration: 150 }}>
				{$unreadCount > 9 ? '9+' : $unreadCount}
			</span>
		{/if}
	</button>

	{#if isOpen}
		<div 
			class="dropdown-menu"
			transition:slide={{ duration: 200, easing: quintOut, axis: 'y' }}
		>
			<div class="dropdown-header">
				<div>
					<h3 class="header-title">Notificaciones</h3>
					<p class="header-subtitle">Tienes {$unreadCount} mensajes sin leer</p>
				</div>
				{#if $unreadCount > 0}
					<button class="btn-mark-read" onclick={handleMarkAllAsRead}>
						Marcar todas como leídas
					</button>
				{/if}
			</div>

			<div class="dropdown-body">
				{#if $notifications.length === 0}
					<div class="empty-state">
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
						<p>No tienes notificaciones por el momento.</p>
					</div>
				{:else}
					{#each $notifications as notification (notification.id)}
						<button 
							class="notification-item" 
							class:unread={!notification.is_read}
							onclick={() => handleMarkAsRead(notification.id)}
						>
							<div class="notification-icon {notification.severity}">
								<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
									<path d={getTypeIcon(notification.severity)}></path>
								</svg>
							</div>
							<div class="notification-content">
								<div class="notification-title-row">
									<span class="notification-title">{notification.title}</span>
									<span class="notification-time">{timeAgo(notification.created_at)}</span>
								</div>
								<p class="notification-message">{notification.message}</p>
							</div>
							{#if !notification.is_read}
								<div class="unread-dot"></div>
							{/if}
						</button>
					{/each}
				{/if}
			</div>

			<div class="dropdown-footer">
				<a href="/profile/notifications" class="btn-view-all" onclick={() => isOpen = false}>
					Ver todas las notificaciones
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.notification-wrapper {
		position: relative;
	}

	.btn-bell {
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		width: 40px;
		height: 40px;
		background: transparent;
		border: none;
		color: var(--text-main, #fff);
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-bell:hover, .btn-bell.active {
		background: var(--btn-glass-bg, rgba(255,255,255,0.1));
		color: #D4AF37;
	}

	.notification-badge {
		position: absolute;
		top: 4px;
		right: 4px;
		background: #ef4444;
		color: white;
		font-size: 0.65rem;
		font-weight: 800;
		height: 16px;
		min-width: 16px;
		padding: 0 4px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--nav-bg, #0B0E14);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 12px);
		right: -10px;
		width: 360px;
		background: white;
		border-radius: 1rem;
		box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.05);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transform-origin: top right;
		z-index: 100;
	}

	:global(html.dark) .dropdown-menu {
		background: #11151d;
		box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05);
	}

	.dropdown-header {
		padding: 1.25rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid rgba(0,0,0,0.05);
	}

	:global(html.dark) .dropdown-header {
		border-bottom-color: rgba(255,255,255,0.05);
	}

	.header-title {
		font-family: 'Outfit', sans-serif;
		font-weight: 700;
		font-size: 1.1rem;
		color: #0f172a;
		margin: 0;
	}

	:global(html.dark) .header-title {
		color: #fff;
	}

	.header-subtitle {
		font-size: 0.75rem;
		color: #64748b;
		margin: 0.25rem 0 0;
	}

	:global(html.dark) .header-subtitle {
		color: #94a3b8;
	}

	.btn-mark-read {
		background: transparent;
		border: none;
		color: #D4AF37;
		font-size: 0.7rem;
		font-weight: 600;
		cursor: pointer;
		padding: 0;
		transition: color 0.2s;
	}

	.btn-mark-read:hover {
		color: #b49126;
		text-decoration: underline;
	}

	.dropdown-body {
		max-height: 400px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.dropdown-body::-webkit-scrollbar {
		width: 4px;
	}
	.dropdown-body::-webkit-scrollbar-track {
		background: transparent;
	}
	.dropdown-body::-webkit-scrollbar-thumb {
		background: rgba(0,0,0,0.1);
		border-radius: 4px;
	}
	:global(html.dark) .dropdown-body::-webkit-scrollbar-thumb {
		background: rgba(255,255,255,0.1);
	}

	.empty-state {
		padding: 3rem 2rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		color: #94a3b8;
	}

	.empty-icon {
		opacity: 0.3;
	}

	.empty-state p {
		font-size: 0.85rem;
		margin: 0;
	}

	.notification-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem 1.25rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid rgba(0,0,0,0.03);
		cursor: pointer;
		text-align: left;
		transition: background 0.2s;
		position: relative;
	}

	:global(html.dark) .notification-item {
		border-bottom-color: rgba(255,255,255,0.03);
	}

	.notification-item:hover {
		background: rgba(0,0,0,0.02);
	}

	:global(html.dark) .notification-item:hover {
		background: rgba(255,255,255,0.02);
	}

	.notification-item.unread {
		background: rgba(212, 175, 55, 0.05);
	}

	:global(html.dark) .notification-item.unread {
		background: rgba(212, 175, 55, 0.1);
	}

	.notification-icon {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.notification-icon.info { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
	.notification-icon.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
	.notification-icon.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
	.notification-icon.alert { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

	.notification-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.notification-title-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.notification-title {
		font-weight: 700;
		font-size: 0.85rem;
		color: #0f172a;
	}

	:global(html.dark) .notification-title {
		color: #e2e8f0;
	}

	.notification-time {
		font-size: 0.65rem;
		color: #94a3b8;
		white-space: nowrap;
		margin-left: 0.5rem;
	}

	.notification-message {
		font-size: 0.8rem;
		color: #475569;
		margin: 0;
		line-height: 1.4;
	}

	:global(html.dark) .notification-message {
		color: #94a3b8;
	}

	.unread-dot {
		width: 8px;
		height: 8px;
		background: #D4AF37;
		border-radius: 50%;
		margin-top: 6px;
		flex-shrink: 0;
	}

	.dropdown-footer {
		padding: 0.75rem;
		text-align: center;
		border-top: 1px solid rgba(0,0,0,0.05);
		background: #f8fafc;
	}

	:global(html.dark) .dropdown-footer {
		border-top-color: rgba(255,255,255,0.05);
		background: #0f131a;
	}

	.btn-view-all {
		display: inline-block;
		color: #D4AF37;
		font-size: 0.8rem;
		font-weight: 700;
		text-decoration: none;
		transition: color 0.2s;
	}

	.btn-view-all:hover {
		color: #b49126;
	}

	@media (max-width: 768px) {
		.dropdown-menu {
			position: fixed;
			top: 60px;
			left: 1rem;
			right: 1rem;
			width: auto;
			max-width: none;
		}
	}
</style>
