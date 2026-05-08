<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fetchPaymentDetail, verifyPayment, resendPaymentEmail } from '$lib/services/admin.service';
	import type { PaymentRead } from '$lib/types/reservation';
	import { toast } from '$lib/stores/toast.svelte';
	import PaymentRejectionModal from '$lib/components/ui/PaymentRejectionModal.svelte';
	import PaymentApprovalModal from '$lib/components/ui/PaymentApprovalModal.svelte';
	import '../../adminPage.css';

	let paymentId = Number(page.params.id);
	let viewingPayment = $state<PaymentRead | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			viewingPayment = await fetchPaymentDetail(paymentId);
		} catch (err: any) {
			error = err.message || 'Error al cargar detalle del pago';
			toast.error(error!);
		} finally {
			loading = false;
		}
	});

	let verifyingAction = $state(false);
	let isRejectModalOpen = $state(false);
	let isApproveModalOpen = $state(false);
	let resendingEmail = $state(false);

	async function handleVerify(action: 'approve' | 'reject') {
		if (action === 'reject') {
			isRejectModalOpen = true;
			return;
		}
		isApproveModalOpen = true;
	}

	async function confirmApproval() {
		verifyingAction = true;
		try {
			const updated = await verifyPayment(paymentId, 'approve', '');
			viewingPayment = updated;
			isApproveModalOpen = false;
			toast.success(`Pago aprobado exitosamente`);
		} catch (err: any) {
			toast.error(err.message || 'Error al aprobar el pago');
		} finally {
			verifyingAction = false;
		}
	}

	async function confirmRejection(reason: string) {
		verifyingAction = true;
		try {
			const updated = await verifyPayment(paymentId, 'reject', reason);
			viewingPayment = updated;
			isRejectModalOpen = false;
			toast.success(`Pago rechazado exitosamente`);
		} catch (err: any) {
			toast.error(err.message || 'Error al rechazar el pago');
		} finally {
			verifyingAction = false;
		}
	}

	async function handleResendEmail() {
		if (resendingEmail) return;
		resendingEmail = true;
		try {
			await resendPaymentEmail(paymentId);
			toast.success('Correo reenviado exitosamente');
		} catch (err: any) {
			toast.error(err.message || 'Error al reenviar el correo');
		} finally {
			resendingEmail = false;
		}
	}

	function formatMethod(m: string) {
		const map: any = { card: 'Tarjeta', cash: 'Efectivo', transfer: 'Transferencia', refund: 'Reembolso' };
		return map[m] || m;
	}

	function formatStatus(s: string) {
		const map: any = { completed: 'Completado', verifying: 'Verificando', failed: 'Fallido/Rechazado' };
		return map[s] || s;
	}

	function formatDateTime(dateStr: string) {
		if (!dateStr) return '---';
		const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
		if (match) {
			const [_, y, m, d, hh, mm, ss] = match;
			const hour = parseInt(hh);
			const ampm = hour >= 12 ? 'p. m.' : 'a. m.';
			const h12 = hour % 12 || 12;
			return `${parseInt(d)}/${parseInt(m)}/${y}, ${h12}:${mm}:${ss} ${ampm}`;
		}
		return dateStr;
	}

	function goBack() {
		goto('/admin/pagos');
	}
</script>

<svelte:head>
	<title>Detalle de Pago | Admin</title>
</svelte:head>

<div class="fade-in max-w-7xl mx-auto pt-4 pb-20 px-4 sm:px-6">
	<div class="mb-10">
		<nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
			<a href="/admin/pagos" class="hover:text-[#D4AF37] transition-colors">Pagos</a>
			<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
			<span class="text-slate-900 dark:text-slate-200">Detalle de Transacción</span>
		</nav>

		<div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
			<div>
				<button class="group flex items-center gap-3 text-slate-500 hover:text-[#D4AF37] transition-all mb-6" onclick={goBack}>
					<div class="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center group-hover:border-[#D4AF37]/50 group-hover:bg-[#D4AF37]/5 dark:group-hover:bg-[#D4AF37]/10 transition-all">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</div>
					<span class="text-xs font-black uppercase tracking-widest">Volver al Listado</span>
				</button>
				<h1 class="admin-title !mb-2">Expediente de Pago</h1>
				<p class="admin-desc">Información detallada de la transacción y sus referencias cruzadas.</p>
			</div>
			<div class="flex items-center gap-3">
				{#if viewingPayment?.status === 'completed' && viewingPayment.method !== 'refund'}
					<button 
						class="admin-btn-secondary !rounded-2xl shadow-xl px-8 flex items-center gap-2 disabled:opacity-50" 
						onclick={handleResendEmail}
						disabled={resendingEmail}
					>
						{#if resendingEmail}
							<div class="w-3 h-3 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
						{:else}
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
						{/if}
						Reenviar Correo
					</button>

					<a href="/admin/pagos/{paymentId}/dte" target="_blank" class="admin-btn !rounded-2xl shadow-xl px-8 flex items-center gap-2">
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
						Generar DTE
					</a>
				{/if}
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center p-32 bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm">
			<div class="w-16 h-16 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin mb-6"></div>
			<p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Cargando transacción...</p>
		</div>
	{:else if error}
		<div class="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-10 rounded-[32px] text-center max-w-2xl mx-auto shadow-sm">
			<p class="text-rose-600 font-bold italic">{error}</p>
			<button class="mt-6 admin-btn-secondary" onclick={goBack}>Volver</button>
		</div>
	{:else if viewingPayment}
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			
			<div class="lg:col-span-8 space-y-8">
				
				<!-- Información de Pago -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800 relative overflow-hidden">
					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Datos de Transacción
					</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Transacción ID</label>
							<p class="text-lg font-bold text-slate-900 dark:text-white">
								#PAY-{viewingPayment.id}
							</p>
						</div>

						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fecha y Hora</label>
							<p class="text-lg font-bold text-slate-900 dark:text-white">
								{formatDateTime(viewingPayment.created_at)}
							</p>
						</div>

						<div class="md:col-span-2 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/30">
							<div class="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-[#D4AF37] font-black border border-slate-100 dark:border-slate-700">
								{viewingPayment.reservation?.user?.profile?.first_name?.charAt(0) || 'C'}
							</div>
							<div class="flex-1">
								<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Cliente</label>
								<p class="text-sm font-bold text-slate-900 dark:text-white">
									{#if viewingPayment.reservation?.user?.profile}
										{viewingPayment.reservation.user.profile.person_type === 'Juridica' ? (viewingPayment.reservation.user.profile.business_name || viewingPayment.reservation.user.profile.first_name) : `${viewingPayment.reservation.user.profile.first_name} ${viewingPayment.reservation.user.profile.last_name === 'N/A' ? '' : viewingPayment.reservation.user.profile.last_name || ''}`}
									{:else}
										{viewingPayment.reservation?.user?.email || 'N/A'}
									{/if}
									<span class="text-[10px] text-slate-400 font-mono ml-2">#{viewingPayment.reservation?.user?.id}</span>
								</p>
								<p class="text-[11px] text-slate-500">{viewingPayment.reservation?.user?.email}</p>
							</div>
							<a href="/admin/clientes/{viewingPayment.reservation?.user_id}" class="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:text-[#AA8222] transition-colors">
								Perfil
							</a>
						</div>

						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tipo de Operación</label>
							<p class="text-sm font-bold text-slate-900 dark:text-white uppercase">
								{viewingPayment.method === 'refund' ? 'REEMBOLSO DE SALDO' : (viewingPayment.receipt_type?.replace('_', ' ') || 'CONSUMIDOR FINAL')}
							</p>
						</div>
					</div>
				</div>

				{#if viewingPayment.receipt_url}
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
					<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-8 flex items-center gap-3">
						<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
						Comprobante de Transferencia
					</h3>
					<div class="flex justify-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
						<a href={viewingPayment.receipt_url} target="_blank" class="block hover:opacity-90 transition-opacity cursor-zoom-in" title="Ver imagen en tamaño completo">
							<img src={viewingPayment.receipt_url} alt="Comprobante" class="max-h-[600px] object-contain rounded-xl shadow-sm" />
						</a>
					</div>
				</div>
				{/if}

				<!-- Referencia Estancia -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800">
					<div class="flex justify-between items-start mb-8">
						<h3 class="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
							<span class="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
							Referencia de Estancia
						</h3>
						<a href="/admin/reservaciones/{viewingPayment.reservation_id}/detalle" class="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] hover:text-[#AA8222] transition-colors">
							Ver Reserva
						</a>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reserva ID</label>
							<p class="text-sm font-bold text-slate-900 dark:text-white">
								{viewingPayment.receipt_data?.reservation_id || '---'}
							</p>
						</div>
						<div>
							<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Habitación</label>
							<p class="text-sm font-bold text-slate-900 dark:text-white">
								#{viewingPayment.receipt_data?.room_number || '---'}
							</p>
						</div>
						
						<div class="md:col-span-2 grid grid-cols-2 gap-6 pt-4 border-t border-slate-50 dark:border-slate-800">
							<div>
								<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Check In</label>
								<p class="text-xs font-bold text-slate-600 dark:text-slate-400">{viewingPayment.receipt_data?.check_in || '---'}</p>
							</div>
							<div>
								<label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Check Out</label>
								<p class="text-xs font-bold text-slate-600 dark:text-slate-400">{viewingPayment.receipt_data?.check_out || '---'}</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Right: System Info & Summary -->
			<div class="lg:col-span-4 sticky top-8 space-y-6">
				<!-- Totals Card -->
				<div class="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 shadow-2xl shadow-[#D4AF37]/5 overflow-hidden relative">
					<div class="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/5 rounded-bl-[100px] -mr-8 -mt-8"></div>
					
					<div class="flex flex-col items-center mb-8 relative">
						<div class="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
						</div>
						<h2 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Monto Cancelado</h2>
						<p class="text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-2">${viewingPayment.amount}</p>
					</div>

					<div class="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800 relative">
						<div class="flex justify-between items-center">
							<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método</span>
							<span class="text-xs font-bold text-slate-900 dark:text-white uppercase">{formatMethod(viewingPayment.method)}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
							<span class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest {viewingPayment.status === 'completed' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : viewingPayment.status === 'verifying' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' : viewingPayment.status === 'failed' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}">
								{formatStatus(viewingPayment.status)}
							</span>
						</div>
					</div>
				</div>

				{#if viewingPayment.status === 'verifying'}
				<div class="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-[32px] p-6 shadow-xl shadow-orange-500/5">
					<h3 class="text-sm font-black text-orange-800 dark:text-orange-400 uppercase tracking-widest mb-4">Verificación de Pago</h3>
					<p class="text-xs text-orange-700 dark:text-orange-300 mb-6 font-medium">Este pago requiere validación manual del comprobante adjunto.</p>
					
					<div class="flex flex-col gap-3">
						<button 
							class="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
							onclick={() => handleVerify('approve')}
							disabled={verifyingAction}
						>
							✅ Aprobar Pago
						</button>
						<button 
							class="w-full py-3 px-4 rounded-xl bg-transparent border-2 border-rose-500 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-bold uppercase tracking-widest text-xs transition-colors disabled:opacity-50"
							onclick={() => handleVerify('reject')}
							disabled={verifyingAction}
						>
							❌ Rechazar Pago
						</button>
					</div>
				</div>
				{/if}


			</div>
		</div>
	{/if}
</div>

<PaymentRejectionModal
	isOpen={isRejectModalOpen}
	onConfirm={confirmRejection}
	onClose={() => (isRejectModalOpen = false)}
	loading={verifyingAction}
/>

<PaymentApprovalModal
	isOpen={isApproveModalOpen}
	onConfirm={confirmApproval}
	onClose={() => (isApproveModalOpen = false)}
	loading={verifyingAction}
/>
