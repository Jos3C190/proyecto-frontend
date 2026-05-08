<script lang="ts">
	import { page } from '$app/stores';
	import { getReservation, getUserWompiLink, createPayment } from '$lib/services/reservation.service';
	import { processTransferPayment } from '$lib/services/payment.service';
	import { updateProfile } from '$lib/services/user.service';
	import type { ReservationRead } from '$lib/types/reservation';
	import type { PaymentRead } from '$lib/types/payment';
	import { onMount, onDestroy } from 'svelte';
	import FiscalDataForm from '$lib/components/ui/FiscalDataForm.svelte';

	let resId = $derived(Number($page.params.res_id));
	let reservation = $state<ReservationRead | null>(null);
	let paymentReceipt = $state<PaymentRead | null>(null);
    let successMessage = $state<string | null>(null);

	let loading = $state(true);
	let processing = $state(false);
	let error = $state<string | null>(null);
    let wompiPolling: any = null;
    let method = $state('card');
    let receiptType = $state('final_consumer');
    let fiscalData = $state<any>(null);
    let transferFile = $state<FileList | null>(null);

	onMount(async () => {
        const id = Number($page.params.res_id);
        if (isNaN(id)) {
            error = "ID de reservación inválido";
            loading = false;
            return;
        }

		try {
			reservation = await getReservation(id);
			if (reservation.status !== 'pending') {
				error = 'Esta reservación ya fue procesada, pagada o cancelada.';
			}
		} catch (err: any) {
			error = err.message || "Error desconocido al cargar la reservación";
		} finally {
			loading = false;
		}
	});

    onDestroy(() => {
        if (wompiPolling) clearInterval(wompiPolling);
    });

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!reservation) return;

		error = null;
		processing = true;

		try {
            // Si es crédito fiscal, primero actualizamos el perfil del usuario para asegurar datos correctos
            if (receiptType === 'fiscal_credit' && fiscalData) {
                try {
                    await updateProfile(fiscalData);
                } catch (err: any) {
                    console.error("Error al actualizar datos fiscales:", err);
                    // No bloqueamos el pago si falla el perfil, pero avisamos en consola
                }
            }

			if (method === 'card') {
                const redirectUrl = `${window.location.origin}/profile/reservations`;
                const url = await getUserWompiLink(reservation.id, redirectUrl);
                // Redirigir a Wompi
                window.location.href = url;
            } else if (method === 'transfer') {
                if (!transferFile || transferFile.length === 0) {
                    error = "Debes subir el comprobante de transferencia";
                    processing = false;
                    return;
                }
                const payment = await processTransferPayment(
                    reservation.id, 
                    Number(reservation.total_cost), 
                    transferFile[0], 
                    receiptType
                );
                paymentReceipt = payment;
                successMessage = "¡Comprobante subido exitosamente! Tu reservación pasará a estado Confirmado cuando sea validado.";
                processing = false;
            } else {
                // Manual payment (Cash)
                const payment = await createPayment(reservation.id, {
                    amount: Number(reservation.total_cost),
                    method: method,
                    receipt_type: receiptType
                });
                paymentReceipt = payment;
                successMessage = "¡Compromiso de pago registrado! Por favor, paga en recepción.";
                processing = false;
            }
		} catch (err: any) {
			error = err.message || "Error al procesar el pago";
            processing = false;
		}
	}

    function printReceipt() {
        window.print();
    }

    function formatDateTime(dateStr: string) {
        if (!dateStr) return '---';
        // Extraer componentes manualmente para evitar que el navegador aplique offsets
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
</script>

<svelte:head>
    <script src="https://checkout.wompi.sv/Widget.js"></script>
    <script src="https://checkout.wompi.co/widget.js"></script>
</svelte:head>


<div class="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 fade-in flex justify-center items-start">
	<div class="w-full max-w-5xl">
		{#if loading}
			<div class="flex flex-col items-center justify-center py-20">
				<div class="h-12 w-12 animate-spin rounded-full border-4 border-[#D4AF37] border-t-transparent mb-4"></div>
				<p class="text-slate-500 font-['Outfit'] tracking-widest uppercase text-sm dark:text-[#D4AF37]">Cargando pasarela...</p>
			</div>
		
		{:else if paymentReceipt && paymentReceipt.receipt_data}
			<!-- Vista de Recibo (Éxito) -->
			<div class="max-w-3xl mx-auto rounded-3xl border border-[#D4AF37]/30 bg-white/80 backdrop-blur-xl p-8 md:p-12 shadow-2xl shadow-[#D4AF37]/10 dark:bg-[#0f131a]/80 dark:border-slate-800 relative overflow-hidden print-area">
				<div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#D4AF37] to-[#AA8222]"></div>
				
				<div class="text-center mb-10 border-b border-dashed border-slate-300 dark:border-slate-700 pb-8">
					<h2 class="font-['Outfit'] text-3xl font-light tracking-widest text-[#D4AF37] uppercase mb-2">
						{paymentReceipt.receipt_data.company}
					</h2>
					<p class="text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase text-sm">
						Factura - {paymentReceipt.receipt_data.receipt_type === 'fiscal_credit' ? 'Crédito Fiscal' : 'Consumidor Final'}
					</p>
					<p class="text-slate-400 dark:text-slate-500 text-xs mt-2">
						Fecha: {formatDateTime(paymentReceipt.receipt_data.date)}
					</p>
				</div>
				
				<div class="space-y-4 mb-8 text-slate-700 dark:text-slate-300">
					<div class="flex flex-col sm:flex-row justify-between border-b border-dotted border-slate-200 dark:border-slate-800 pb-3">
						<span class="text-slate-500 text-sm font-bold uppercase tracking-wider">Cliente</span>
						<span class="font-medium font-['Outfit']">
                            {#if paymentReceipt.receipt_data.receipt_type === 'fiscal_credit'}
                                {paymentReceipt.receipt_data.business_name || paymentReceipt.receipt_data.customer}
                            {:else}
                                {paymentReceipt.receipt_data.customer}
                            {/if}
                        </span>
					</div>
                    
                    {#if paymentReceipt.receipt_data.receipt_type === 'fiscal_credit'}
                        <div class="grid grid-cols-2 gap-4 border-b border-dotted border-slate-200 dark:border-slate-800 pb-3">
                            <div class="flex flex-col">
                                <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">NIT</span>
                                <span class="font-medium text-sm">{paymentReceipt.receipt_data.nit || '---'}</span>
                            </div>
                            <div class="flex flex-col">
                                <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">NRC</span>
                                <span class="font-medium text-sm">{paymentReceipt.receipt_data.nrc || '---'}</span>
                            </div>
                            <div class="flex flex-col col-span-2">
                                <span class="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Giro</span>
                                <span class="font-medium text-sm">{paymentReceipt.receipt_data.economic_activity || '---'}</span>
                            </div>
                        </div>
                    {/if}
					<div class="flex flex-col sm:flex-row justify-between border-b border-dotted border-slate-200 dark:border-slate-800 pb-3">
						<span class="text-slate-500 text-sm font-bold uppercase tracking-wider">Reservación ID</span>
						<span class="font-medium font-['Outfit'] text-[#D4AF37]">{paymentReceipt.receipt_data.reservation_id}</span>
					</div>
					<div class="flex flex-col sm:flex-row justify-between border-b border-dotted border-slate-200 dark:border-slate-800 pb-3">
						<span class="text-slate-500 text-sm font-bold uppercase tracking-wider">Habitación</span>
						<span class="font-medium">{paymentReceipt.receipt_data.room_number} <span class="text-slate-400">({paymentReceipt.receipt_data.room_type})</span></span>
					</div>
					<div class="flex flex-col sm:flex-row justify-between border-b border-dotted border-slate-200 dark:border-slate-800 pb-3">
						<span class="text-slate-500 text-sm font-bold uppercase tracking-wider">Estadía</span>
						<span class="font-medium">{new Date(paymentReceipt.receipt_data.check_in).toLocaleDateString()} a {new Date(paymentReceipt.receipt_data.check_out).toLocaleDateString()}</span>
					</div>
					<div class="flex flex-col sm:flex-row justify-between border-b border-dotted border-slate-200 dark:border-slate-800 pb-3">
						<span class="text-slate-500 text-sm font-bold uppercase tracking-wider">Método de Pago</span>
						<span class="font-medium capitalize">{paymentReceipt.receipt_data.method}</span>
					</div>
				</div>

				<div class="bg-slate-50 dark:bg-black/30 rounded-xl p-6 text-right border border-slate-100 dark:border-slate-800 mb-10">
					<p class="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">Total Pagado</p>
					<h3 class="font-['Outfit'] text-4xl text-[#D4AF37] font-semibold">${Number(paymentReceipt.receipt_data.amount_paid).toFixed(2)}</h3>
				</div>

				<div class="no-print flex flex-col sm:flex-row gap-4 justify-center">
					<button onclick={printReceipt} class="px-8 py-3 rounded-xl border border-[#D4AF37] text-[#D4AF37] text-sm font-bold uppercase tracking-widest transition-all hover:bg-[#D4AF37] hover:text-[#0B0E14] shadow-lg shadow-[#D4AF37]/10 flex-1">
						Imprimir Recibo
					</button>
					<a href="/profile/reservations" class="px-8 py-3 rounded-xl bg-slate-800 text-white text-sm font-bold uppercase tracking-widest transition-all hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white text-center flex-1">
						Continuar
					</a>
				</div>
			</div>

		{:else if successMessage}
			<div class="max-w-2xl mx-auto rounded-2xl border border-green-200 bg-white/70 backdrop-blur-xl p-10 text-center shadow-xl dark:border-green-900/30 dark:bg-slate-900/80">
				<div class="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
					<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
				</div>
				<h3 class="font-['Outfit'] text-3xl font-bold text-slate-800 dark:text-white mb-4">¡Pago Exitoso!</h3>
				<p class="text-slate-600 dark:text-slate-400 mb-8 text-lg">{successMessage}</p>
				<a href="/profile/reservations" class="inline-block px-10 py-4 rounded-xl font-bold uppercase tracking-widest transition-all bg-[#D4AF37] text-slate-900 hover:bg-[#f3cd54] shadow-lg shadow-[#D4AF37]/20 text-center">
					Ver Mis Reservaciones
				</a>
			</div>

		{:else if error}
			<div class="max-w-2xl mx-auto rounded-2xl border border-red-200 bg-white/70 backdrop-blur-xl p-8 text-center shadow-xl dark:border-red-900/30 dark:bg-slate-900/80">
				<div class="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
					<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
				</div>
				<h3 class="font-['Outfit'] text-2xl text-slate-800 dark:text-white mb-2">Error en el Pago</h3>
				<p class="text-slate-600 dark:text-slate-400 mb-8">{error}</p>
				<a href="/profile/reservations" class="inline-block px-8 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold uppercase tracking-widest transition-all hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 text-center">
					Volver a Mis Reservas
				</a>
			</div>

		{:else if reservation}
			<div class="mb-10 text-center">
				<h2 class="font-['Outfit'] text-4xl font-light tracking-wide text-slate-800 dark:text-white mb-2">
					Pasarela de <span class="text-[#D4AF37] font-semibold">Pago</span>
				</h2>
				<p class="text-slate-500 dark:text-slate-400 font-medium tracking-wide">Transacción segura y encriptada.</p>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
				
				<!-- Resumen (Izquierda) -->
				<div class="lg:col-span-2 rounded-2xl border border-slate-200/50 bg-gradient-to-br from-slate-50 to-white backdrop-blur-xl p-8 shadow-xl dark:from-slate-800/50 dark:to-slate-900/50">
					<h3 class="font-['Outfit'] text-sm tracking-widest uppercase font-semibold text-slate-500 dark:text-[#D4AF37] mb-6 border-b border-slate-200/50 dark:border-slate-700/50 pb-4">
						Resumen del Cargo
					</h3>
					
					<div class="space-y-4 mb-8">
						<div class="flex justify-between items-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-700">
							<span class="text-slate-500 dark:text-slate-400 text-sm">Cód. Reserva</span>
							<span class="font-bold text-slate-800 dark:text-slate-200 font-['Outfit']">{reservation.unique_id}</span>
						</div>
                        
                        <!-- Tax Breakdown reactive to receiptType -->
                        {#if receiptType === 'fiscal_credit'}
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-slate-500 dark:text-slate-400">Subtotal (sin IVA)</span>
                                <span class="text-slate-800 dark:text-slate-200">
                                    ${reservation.subtotal ? Number(reservation.subtotal).toFixed(2) : (Number(reservation.total_cost) / 1.18).toFixed(2)}
                                </span>
                            </div>
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-slate-500 dark:text-slate-400">IVA (13%)</span>
                                <span class="text-slate-800 dark:text-slate-200">
                                    ${reservation.tax_iva ? Number(reservation.tax_iva).toFixed(2) : ((Number(reservation.total_cost) / 1.18) * 0.13).toFixed(2)}
                                </span>
                            </div>
                        {:else}
                            <div class="flex justify-between items-center text-sm">
                                <span class="text-slate-500 dark:text-slate-400">Subtotal (IVA incluido)</span>
                                <span class="text-slate-800 dark:text-slate-200">
                                    ${((reservation.subtotal ? Number(reservation.subtotal) : (Number(reservation.total_cost) / 1.18)) * 1.13).toFixed(2)}
                                </span>
                            </div>
                        {/if}

                        <div class="flex justify-between items-center text-sm pb-3 border-b border-dashed border-slate-200 dark:border-slate-700">
                            <span class="text-slate-500 dark:text-slate-400">Impuesto Turismo (5%)</span>
                            <span class="text-slate-800 dark:text-slate-200">
                                ${reservation.tax_tourism ? Number(reservation.tax_tourism).toFixed(2) : ((Number(reservation.total_cost) / 1.18) * 0.05).toFixed(2)}
                            </span>
                        </div>

						<div class="flex justify-between items-center">
							<span class="text-slate-500 dark:text-slate-400 text-sm">Estado</span>
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 border border-yellow-200 dark:border-yellow-800/50 uppercase tracking-wider">
								Pendiente
							</span>
						</div>
					</div>

					<div class="bg-[#D4AF37]/5 dark:bg-[#D4AF37]/10 rounded-xl p-5 border border-[#D4AF37]/20 text-center">
						<span class="block text-slate-500 dark:text-[#D4AF37]/80 text-xs font-bold uppercase tracking-widest mb-1">Total a Cancelar</span>
						<span class="font-['Outfit'] text-4xl text-[#D4AF37] font-bold">${Number(reservation.total_cost).toFixed(2)}</span>
					</div>
				</div>

				<!-- Formulario de Pago (Derecha) -->
				<div class="lg:col-span-3 rounded-2xl border border-[#D4AF37]/20 bg-white/80 backdrop-blur-xl p-8 shadow-2xl dark:bg-[#0B0E14]/80 dark:border-[#D4AF37]/20 relative overflow-hidden">
					<div class="absolute -top-10 -right-10 w-40 h-40 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>

					<form onsubmit={handleSubmit} class="space-y-6 relative z-10">
						<div class="space-y-2">
							<label for="method" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Método de Pago</label>
							<div class="relative">
								<select id="method" bind:value={method} required
									class="appearance-none w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50">
									<option value="card">💳 Tarjeta de Crédito / Débito</option>
									<option value="transfer">🏦 Transferencia Bancaria</option>
									<option value="cash">💵 Efectivo (Pago en el hotel)</option>
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>
						
						<div class="space-y-2">
							<label for="receiptType" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Tipo de Comprobante</label>
							<div class="relative">
								<select id="receiptType" bind:value={receiptType} required
									class="appearance-none w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50">
									<option value="final_consumer">Consumidor Final (Ticket)</option>
									<option value="fiscal_credit">Crédito Fiscal (Factura)</option>
								</select>
								<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
								</div>
							</div>
						</div>

                        {#if receiptType === 'fiscal_credit' && reservation.user}
                            <div class="mt-4 p-2 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                <FiscalDataForm 
                                    profile={reservation.user.profile || {}} 
                                    onUpdate={(data) => fiscalData = data} 
                                />
                            </div>
                        {/if}

						{#if method === 'transfer'}
						<div class="space-y-2">
							<label for="transferFile" class="block text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Comprobante de Transferencia (Imagen)</label>
							<div class="relative">
								<input type="file" id="transferFile" bind:files={transferFile} accept="image/*" required
									class="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all dark:bg-slate-800/50 dark:border-slate-700 dark:text-white dark:focus:ring-[#D4AF37]/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#D4AF37]/20 file:text-[#D4AF37] hover:file:bg-[#D4AF37]/30" />
							</div>
						</div>
						{/if}

						<div class="rounded-xl bg-green-50/50 border border-green-100 p-4 flex gap-3 items-start dark:bg-green-900/10 dark:border-green-900/30">
							<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
							<p class="text-sm text-green-800 dark:text-green-300">
								{#if method === 'card'}
                                    <strong>Pago Seguro:</strong> Esta transacción será procesada de forma segura a través de <strong>Wompi SV</strong>.
                                {:else if method === 'transfer'}
                                    <strong>Instrucciones:</strong> Al confirmar, se registrará su compromiso de pago. Por favor realice la transferencia a la cuenta <strong>123-456789-0 del Banco Agrícola</strong>.
                                {:else}
                                    <strong>Pago en Hotel:</strong> Puede realizar su pago en recepción al momento de su llegada en efectivo o tarjeta.
                                {/if}
							</p>
						</div>

						<div class="pt-6 border-t border-slate-200/50 dark:border-slate-700/50 text-right">
							<button type="submit" disabled={processing} class="w-full sm:w-auto px-10 py-4 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA8222] text-sm font-bold uppercase tracking-widest text-slate-900 transition-all hover:from-[#f3cd54] hover:to-[#c69a2b] shadow-xl shadow-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ml-auto">
								{#if processing}
									<span class="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
									Procesando...
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
									{method === 'card' ? `Pagar $${Number(reservation.total_cost).toFixed(2)} con Wompi` : method === 'transfer' ? 'Subir Comprobante' : 'Confirmar Compromiso de Pago'}
								{/if}
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.fade-in {
		animation: fadeIn 0.5s ease-out forwards;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(15px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@media print {
		:global(body) {
			background: white !important;
		}
		:global(nav), :global(footer), :global(.no-print) { 
			display: none !important; 
		}
		.print-area { 
			box-shadow: none !important;
			border: none !important;
			width: 100% !important;
			max-width: 100% !important;
			padding: 0 !important;
		}
	}
</style>
