<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { authStore } from '$lib/stores/auth.store';
	import { hasPermission } from '$lib/types';
	import {
		fetchRoles,
		createRole,
		updateRole,
		deleteRole,
		type RoleCreate,
		type RoleUpdate
	} from '$lib/services/admin.service';
	import type { RoleRead } from '$lib/types';
	import '../adminPage.css';

	let roles = $state<RoleRead[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreate = $state(false);
	let editingRole = $state<RoleRead | null>(null);
	let formData = $state({ name: '', description: '' });
	let formError = $state<string | null>(null);
	let formLoading = $state(false);

	async function load() {
		try {
			roles = await fetchRoles();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error de conexión';
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		formData = { name: '', description: '' };
		formError = null;
		showCreate = true;
	}

	function openEdit(r: RoleRead) {
		editingRole = r;
		formData = { name: r.name, description: r.description ?? '' };
		formError = null;
	}

	function closeModals() {
		showCreate = false;
		editingRole = null;
	}

	async function handleCreate(e: Event) {
		e.preventDefault();
		formError = null;
		if (!formData.name.trim()) {
			formError = 'El nombre es obligatorio.';
			return;
		}
		formLoading = true;
		try {
			const data: RoleCreate = {
				name: formData.name.trim(),
				description: formData.description.trim() || null
			};
			await createRole(data);
			closeModals();
			await load();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al crear rol';
		} finally {
			formLoading = false;
		}
	}

	async function handleUpdate(e: Event) {
		e.preventDefault();
		if (!editingRole) return;
		formError = null;
		if (!formData.name.trim()) {
			formError = 'El nombre es obligatorio.';
			return;
		}
		formLoading = true;
		try {
			const data: RoleUpdate = {
				name: formData.name.trim(),
				description: formData.description.trim() || null
			};
			await updateRole(editingRole.id, data);
			closeModals();
			await load();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al actualizar rol';
		} finally {
			formLoading = false;
		}
	}

	async function handleDelete(r: RoleRead) {
		if (!confirm(`¿Eliminar el rol "${r.name}"? Los usuarios con este rol deberán ser reasignados primero.`)) return;
		try {
			await deleteRole(r.id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al eliminar rol';
		}
	}

	onMount(async () => {
		if (!hasPermission($authStore.user, 'roles', 'read')) {
			goto('/dashboard', { replaceState: true });
			return;
		}
		await load();
	});
</script>

<div class="admin-page">
	<h1 class="admin-title">Roles</h1>
	<p class="admin-desc">Crea y edita roles. Asigna permisos desde la sección Permisos.</p>

	<div class="admin-toolbar">
		{#if hasPermission($authStore.user, 'roles', 'create')}
			<button type="button" class="admin-btn" onclick={openCreate}>Crear rol</button>
		{/if}
	</div>

	{#if loading}
		<p class="admin-loading">Cargando...</p>
	{:else if error}
		<div class="admin-error" role="alert">{error}</div>
	{:else}
		<section class="admin-section">
			<table class="admin-table">
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Descripción</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each roles as r}
						<tr>
							<td><span class="admin-badge">{r.name}</span></td>
							<td>{r.description ?? '—'}</td>
							<td>
								{#if hasPermission($authStore.user, 'roles', 'update')}
									<button
										type="button"
										class="admin-btn-secondary mr-2"
										onclick={() => openEdit(r)}
									>
										Editar
									</button>
								{/if}
								{#if hasPermission($authStore.user, 'roles', 'delete')}
									<button
										type="button"
										class="admin-btn-danger"
										onclick={() => handleDelete(r)}
									>
										Eliminar
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}
</div>

{#if showCreate}
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal">
			<h2 class="admin-modal-title">Crear rol</h2>
			<form onsubmit={handleCreate}>
				{#if formError}
					<div class="admin-error mb-4">{formError}</div>
				{/if}
				<div class="admin-field">
					<label for="create-role-name">Nombre</label>
					<input id="create-role-name" type="text" bind:value={formData.name} placeholder="ej. editor" required />
				</div>
				<div class="admin-field">
					<label for="create-role-desc">Descripción</label>
					<input id="create-role-desc" type="text" bind:value={formData.description} placeholder="Opcional" />
				</div>
				<div class="admin-modal-actions">
					<button type="button" class="admin-btn-secondary" onclick={closeModals}>Cancelar</button>
					<button type="submit" class="admin-btn" disabled={formLoading}>
						{formLoading ? 'Guardando...' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if editingRole}
	<div class="admin-modal-overlay" role="dialog" aria-modal="true">
		<div class="admin-modal">
			<h2 class="admin-modal-title">Editar rol</h2>
			<form onsubmit={handleUpdate}>
				{#if formError}
					<div class="admin-error mb-4">{formError}</div>
				{/if}
				<div class="admin-field">
					<label for="edit-role-name">Nombre</label>
					<input id="edit-role-name" type="text" bind:value={formData.name} required />
				</div>
				<div class="admin-field">
					<label for="edit-role-desc">Descripción</label>
					<input id="edit-role-desc" type="text" bind:value={formData.description} />
				</div>
				<div class="admin-modal-actions">
					<button type="button" class="admin-btn-secondary" onclick={closeModals}>Cancelar</button>
					<button type="submit" class="admin-btn" disabled={formLoading}>
						{formLoading ? 'Guardando...' : 'Guardar'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
