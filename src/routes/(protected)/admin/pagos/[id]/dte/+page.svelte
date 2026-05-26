<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { fetchPaymentDetail, fetchSystemSettings } from '$lib/services/admin.service';
	import type { PaymentRead } from '$lib/types/reservation';
	import { Country, State, City } from 'country-state-city';
	import QRCode from 'qrcode';

	let paymentId = Number(page.params.id);
	let payment = $state<PaymentRead | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let qrCodeDataUrl = $state<string | null>(null);
	let isSaving = $state(false);

	// Información dinámica del hotel
	let hotelInfo = $state({
		name: 'AFE Resort & Spa',
		phone: '2222-0000',
		email: 'facturacionelectronica@aferesort.com'
	});

	// Derivación de iniciales del hotel para el logo
	let hotelAbbr = $derived.by(() => {
		const name = hotelInfo.name;
		if (name === 'AFE Resort & Spa') return 'AFE';
		const words = name.split(/\s+/).filter(w => w.length > 2);
		if (words.length >= 2) {
			return words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
		}
		return name.substring(0, 3).toUpperCase();
	});

	$effect(() => {
		if (payment) {
			const profile = payment.reservation?.user?.profile;
			let receptorName = 'Cliente';
			
			if (profile) {
				if (profile.person_type === 'Juridica') {
					receptorName = profile.business_name || profile.first_name;
				} else {
					receptorName = `${profile.first_name} ${profile.last_name === 'N/A' ? '' : profile.last_name}`.trim();
				}
			}
				
			const qrContent = `DTE: ${payment.id}\nEmisor: ${hotelInfo.name}\nReceptor: ${receptorName}\nTotal: $${payment.amount}\nFecha: ${formatDateTime(payment.created_at)}`;
			
			QRCode.toDataURL(qrContent, { margin: 1, width: 120 }, (err, url) => {
				if (!err) {
					qrCodeDataUrl = url;
				}
			});
		}
	});

	onMount(async () => {
		try {
			const [payRes, sysRes] = await Promise.all([
				fetchPaymentDetail(paymentId),
				fetchSystemSettings()
			]);
			payment = payRes;

			// Cargar metadatos comerciales del hotel
			const nameSetting = sysRes.find(s => s.key === 'hotel_name')?.value;
			const phoneSetting = sysRes.find(s => s.key === 'hotel_phone')?.value;
			const emailSetting = sysRes.find(s => s.key === 'hotel_email')?.value;

			if (nameSetting) hotelInfo.name = nameSetting;
			if (phoneSetting) hotelInfo.phone = phoneSetting;
			if (emailSetting) hotelInfo.email = emailSetting;
		} catch (err: any) {
			error = err.message || 'Error al cargar detalle';
		} finally {
			loading = false;
		}
	});

	function printDTE() {
		window.print();
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

	async function downloadPDF() {
		try {
			isSaving = true;
			const element = document.getElementById('dte-paper-container');
			if (!element) {
				isSaving = false;
				return;
			}
			
			// Usamos el bundle minificado directamente para evitar problemas con Vite/Rollup
			const module = await import('html2pdf.js/dist/html2pdf.bundle.min.js');
			const html2pdf = module.default || module;
			
			const opt = {
				margin: 0,
				filename: `DTE-PAY-${paymentId}.pdf`,
				image: { type: 'jpeg', quality: 1 },
				html2canvas: { scale: 2, useCORS: true, logging: false },
				jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
			};

			await html2pdf().set(opt).from(element).save();
		} catch (err) {
			console.error("Error al generar PDF:", err);
			import('$lib/stores/toast.svelte').then(({ toast }) => {
				toast.error("Ocurrió un error al generar el PDF. Revisa la consola para más detalles.");
			});
		} finally {
			isSaving = false;
		}
	}

	function getFullAddress(userProfile: any): string {
		if (!userProfile) return 'N/A';
		
		let parts = [];
		if (userProfile.address_complement) parts.push(userProfile.address_complement);
		if (userProfile.municipality) parts.push(userProfile.municipality);
		
		if (userProfile.department && userProfile.country) {
			const stateName = State.getStateByCodeAndCountry(userProfile.department, userProfile.country)?.name || userProfile.department;
			parts.push(stateName);
		}
		
		if (userProfile.country) {
			const countryName = Country.getCountryByCode(userProfile.country)?.name || userProfile.country;
			parts.push(countryName);
		}
		
		return parts.length > 0 ? parts.join(', ').toUpperCase() : 'CIUDAD';
	}

	function numeroALetras(num: number): string {
		const Unidades = (n: number) => {
			switch(n) {
				case 1: return 'UN'; case 2: return 'DOS'; case 3: return 'TRES';
				case 4: return 'CUATRO'; case 5: return 'CINCO'; case 6: return 'SEIS';
				case 7: return 'SIETE'; case 8: return 'OCHO'; case 9: return 'NUEVE';
				default: return '';
			}
		};
		const Decenas = (n: number) => {
			let decena = Math.floor(n/10); let unidad = n - (decena * 10);
			switch(decena) {
				case 1:
					switch(unidad) {
						case 0: return 'DIEZ'; case 1: return 'ONCE'; case 2: return 'DOCE';
						case 3: return 'TRECE'; case 4: return 'CATORCE'; case 5: return 'QUINCE';
						default: return 'DIECI' + Unidades(unidad);
					}
				case 2:
					switch(unidad) {
						case 0: return 'VEINTE'; default: return 'VEINTI' + Unidades(unidad);
					}
				case 3: return DecenasY('TREINTA', unidad);
				case 4: return DecenasY('CUARENTA', unidad);
				case 5: return DecenasY('CINCUENTA', unidad);
				case 6: return DecenasY('SESENTA', unidad);
				case 7: return DecenasY('SETENTA', unidad);
				case 8: return DecenasY('OCHENTA', unidad);
				case 9: return DecenasY('NOVENTA', unidad);
				case 0: return Unidades(unidad);
				default: return '';
			}
		};
		const DecenasY = (strSin: string, numUnidades: number) => {
			if (numUnidades > 0) return strSin + ' Y ' + Unidades(numUnidades);
			return strSin;
		};
		const Centenas = (n: number) => {
			let centenas = Math.floor(n / 100); let decenas = n - (centenas * 100);
			switch(centenas) {
				case 1: return decenas > 0 ? 'CIENTO ' + Decenas(decenas) : 'CIEN';
				case 2: return 'DOSCIENTOS ' + Decenas(decenas);
				case 3: return 'TRESCIENTOS ' + Decenas(decenas);
				case 4: return 'CUATROCIENTOS ' + Decenas(decenas);
				case 5: return 'QUINIENTOS ' + Decenas(decenas);
				case 6: return 'SEISCIENTOS ' + Decenas(decenas);
				case 7: return 'SETECIENTOS ' + Decenas(decenas);
				case 8: return 'OCHOCIENTOS ' + Decenas(decenas);
				case 9: return 'NOVECIENTOS ' + Decenas(decenas);
				default: return Decenas(decenas);
			}
		};
		const Seccion = (n: number, divisor: number, strSingular: string, strPlural: string) => {
			let cientos = Math.floor(n / divisor);
			if (cientos > 0) return cientos > 1 ? Centenas(cientos) + ' ' + strPlural : strSingular;
			return '';
		};
		const Miles = (n: number) => {
			let divisor = 1000; let cientos = Math.floor(n / divisor); let resto = n - (cientos * divisor);
			let strMiles = Seccion(n, divisor, 'MIL', 'MIL'); let strCentenas = Centenas(resto);
			return strMiles === '' ? strCentenas : strMiles + ' ' + strCentenas;
		};
		const Millones = (n: number) => {
			let divisor = 1000000; let cientos = Math.floor(n / divisor); let resto = n - (cientos * divisor);
			let strMillones = Seccion(n, divisor, 'UN MILLON', 'MILLONES'); let strMiles = Miles(resto);
			return strMillones === '' ? strMiles : strMillones + ' ' + strMiles;
		};

		let enteros = Math.floor(num);
		let centavos = Math.round((num - enteros) * 100);
		
		let letras = enteros === 0 ? 'CERO' : Millones(enteros).trim();
		return `${letras} ${centavos.toString().padStart(2, '0')}/100 DÓLARES`;
	}

	let isFiscalCredit = $derived(payment?.receipt_type === 'fiscal_credit');
	
	// Helper to calculate proportions if the payment is partial
	let subtotal = $derived(payment?.reservation?.subtotal || 0);
	let iva = $derived(payment?.reservation?.tax_iva || 0);
	let tourism = $derived(payment?.reservation?.tax_tourism || 0);
	let total_cost = $derived(payment?.reservation?.total_cost || 1); // Avoid div by zero

	// Factor to apply to the taxes based on this payment's amount
	let paymentFactor = $derived((payment?.amount || 0) / total_cost);

	let currentSubtotal = $derived(subtotal * paymentFactor);
	let currentIva = $derived(iva * paymentFactor);
	let currentTourism = $derived(tourism * paymentFactor);
</script>

<svelte:head>
	<title>DTE - #{paymentId} | {hotelInfo.name}</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-slate-100 flex items-center justify-center">
		<div class="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full"></div>
	</div>
{:else if error}
	<div class="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-rose-600 font-bold">
		{error}
	</div>
{:else if payment}
	<!-- Contenedor Principal (Visor) -->
	<div class="bg-slate-200 py-12 flex flex-col items-center shadow-inner print:bg-white print:p-0 print:shadow-none min-h-screen">
		
		<!-- Toolbar Estática -->
		<div class="print:hidden bg-slate-800 text-white p-4 flex flex-col md:flex-row items-center justify-between shadow-md w-full max-w-[210mm] rounded-[16px] mb-8 gap-4">
			<div class="flex items-center gap-4 w-full md:w-auto">
				<a href="/admin/pagos/{paymentId}" class="flex items-center gap-2 text-slate-300 hover:text-white transition-colors text-sm font-medium">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
					Volver
				</a>
			</div>
			<div class="font-mono text-sm opacity-80 hidden md:block">
				Comprobante Fiscal - PAY-{payment.id}
			</div>
			<div class="flex items-center gap-3 w-full md:w-auto justify-end">
				<button onclick={printDTE} class="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-xs transition-colors shadow-sm disabled:opacity-50" disabled={isSaving}>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2v4h10z"></path></svg>
					Imprimir
				</button>
				<button onclick={downloadPDF} disabled={isSaving} class="bg-[#D4AF37] hover:bg-[#AA8222] disabled:bg-slate-400 disabled:hover:scale-100 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg flex items-center gap-2 font-bold text-xs transition-transform hover:scale-[1.02] shadow-sm">
					{#if isSaving}
						<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Procesando...
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-3 3m0 0l-3-3m3 3V4"></path></svg>
						Guardar PDF
					{/if}
				</button>
			</div>
		</div>

		<!-- Hoja -->
		<div id="dte-paper-container" class="dte-paper bg-[#ffffff] text-[#000000] shadow-2xl relative rounded-[24px] print:rounded-none">
			
			<!-- HEADER -->
			<div class="flex justify-between items-start mb-4">
				<div class="w-[120px] h-[120px] flex items-center justify-center border border-[#e2e8f0] rounded-full">
					<div class="text-center">
						<div class="font-black text-xl tracking-tighter">{hotelAbbr}</div>
						<div class="text-[8px] uppercase tracking-widest mt-1">{hotelInfo.name.toUpperCase()}</div>
					</div>
				</div>

				<div class="text-center flex-1 pt-6">
					<h1 class="font-bold text-sm">DOCUMENTO TRIBUTARIO ELECTRÓNICO</h1>
					<h2 class="font-bold text-sm mt-1">{payment.receipt_type?.replace('_', ' ').toUpperCase() || 'FACTURA'}</h2>
				</div>

				<div class="w-[120px] h-[120px] border border-[#000000] p-1 flex items-center justify-center">
					{#if qrCodeDataUrl}
						<img src={qrCodeDataUrl} alt="QR Code" class="w-full h-full object-contain" />
					{:else}
						<div class="w-full h-full bg-[#f1f5f9] flex items-center justify-center text-[10px] text-[#94a3b8]">QR</div>
					{/if}
				</div>
			</div>

			<!-- Meta Info -->
			<div class="grid grid-cols-2 text-[10px] gap-4 mb-4 leading-tight">
				<div>
					<p><span class="font-bold">Código de Generación:</span> 4993AB40-5E45-47C0-8F41-{payment.id.toString().padStart(12, '0')}</p>
					<p><span class="font-bold">Número de Control:</span> DTE-01-S001P001-{payment.id.toString().padStart(15, '0')}</p>
					<p><span class="font-bold">Sello de Recepción:</span> 2026A6F5AE42BD8642B79FB8E598599430DCNZKZ</p>
				</div>
				<div class="text-right">
					<p><span class="font-bold">Modelo de Facturación:</span> Transmisión normal</p>
					<p><span class="font-bold">Tipo de Transmisión:</span> Normal</p>
					<p><span class="font-bold">Fecha y Hora de Generación:</span> {formatDateTime(payment.created_at)}</p>
				</div>
			</div>

			<!-- Emisor / Receptor Boxes -->
			<div class="grid grid-cols-2 gap-4 mb-6">
				<div>
					<div class="text-center font-bold text-[10px] mb-1">Emisor</div>
					<div class="border border-[#000000] rounded-xl p-3 text-[10px] min-h-[90px] leading-tight">
						<p><span class="font-bold">Nombre:</span> {hotelInfo.name.toUpperCase() + (hotelInfo.name.toUpperCase().includes('S.A.') ? '' : ' S.A. DE C.V.')}</p>
						<p><span class="font-bold">Correo electrónico:</span> {hotelInfo.email}</p>
						<p><span class="font-bold">Dirección:</span> Final Av. La Revolución, Zona Costera, El Salvador</p>
						<p><span class="font-bold">Teléfono:</span> {hotelInfo.phone}</p>
						<p><span class="font-bold">NIT:</span> 0614-010101-101-1  <span class="font-bold ml-2">NRC:</span> 123456-7</p>
						<p><span class="font-bold">Actividad económica:</span> SERVICIOS DE ALOJAMIENTO</p>
					</div>
				</div>
				<div>
					<div class="text-center font-bold text-[10px] mb-1">Receptor</div>
					<div class="border border-[#000000] rounded-xl p-3 text-[10px] min-h-[90px] leading-tight">
						<p><span class="font-bold">Nombre:</span> 
							{#if payment.reservation?.user?.profile?.person_type === 'Juridica'}
								{(payment.reservation.user.profile.business_name || payment.reservation.user.profile.first_name).toUpperCase()}
							{:else}
								{(payment.reservation?.user?.profile?.first_name + (payment.reservation?.user?.profile?.last_name && payment.reservation.user.profile.last_name !== 'N/A' ? ' ' + payment.reservation.user.profile.last_name : '')).toUpperCase()}
							{/if}
						</p>
						<p><span class="font-bold">Correo electrónico:</span> {payment.reservation?.user?.email}</p>
						<p><span class="font-bold">Dirección:</span> {getFullAddress(payment.reservation?.user?.profile)}</p>
						<p><span class="font-bold">Teléfono:</span> {payment.reservation?.user?.profile?.phone || '---'}</p>
						
						{#if payment.reservation?.user?.profile?.person_type === 'Juridica'}
							<p><span class="font-bold">NIT:</span> {payment.reservation?.user?.profile?.nit || '---'} <span class="font-bold ml-2">NRC:</span> {payment.reservation?.user?.profile?.nrc || '---'}</p>
							<p><span class="font-bold">Actividad económica:</span> {payment.reservation?.user?.profile?.economic_activity || '---'}</p>
						{:else}
							<p><span class="font-bold">DUI / Documento:</span> {payment.reservation?.user?.profile?.document_number || '---'}</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Tabla de Detalles -->
			<div class="mb-4">
				<table class="w-full text-[10px] border-collapse border border-[#000000] text-center">
					<thead>
						<tr class="font-bold">
							<th class="border border-[#000000] p-1 w-6">Nº</th>
							<th class="border border-[#000000] p-1 w-12">Cant.</th>
							<th class="border border-[#000000] p-1 w-16">Unidad</th>
							<th class="border border-[#000000] p-1 text-left">Descripción</th>
							<th class="border border-[#000000] p-1 w-20">Precio<br>Unitario</th>
							<th class="border border-[#000000] p-1 w-16">Venta no<br>sujeta</th>
							<th class="border border-[#000000] p-1 w-16">Venta<br>exenta</th>
							<th class="border border-[#000000] p-1 w-16">Venta<br>gravada</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td class="border-r border-[#000000] p-1">1</td>
							<td class="border-r border-[#000000] p-1">1.00</td>
							<td class="border-r border-[#000000] p-1">Servicio</td>
							<td class="border-r border-[#000000] p-1 text-left">
								Servicio de Alojamiento (Hab #{payment.receipt_data?.room_number || '---'})<br>
								<span class="text-[9px] text-[#475569]">Ref: {payment.reservation?.unique_id}</span>
							</td>
							<!-- En Credito Fiscal el Unitario no lleva IVA -->
							<td class="border-r border-[#000000] p-1 text-right">
								${isFiscalCredit ? Number(currentSubtotal).toFixed(2) : (Number(currentSubtotal) + Number(currentIva)).toFixed(2)}
							</td>
							<td class="border-r border-[#000000] p-1 text-right">$0.00</td>
							<td class="border-r border-[#000000] p-1 text-right">$0.00</td>
							<td class="p-1 text-right">
								${isFiscalCredit ? Number(currentSubtotal).toFixed(2) : (Number(currentSubtotal) + Number(currentIva)).toFixed(2)}
							</td>
						</tr>
						<!-- Row for Tourism Tax if exists -->
						{#if currentTourism > 0}
						<tr>
							<td class="border-r border-[#000000] p-1">2</td>
							<td class="border-r border-[#000000] p-1">1.00</td>
							<td class="border-r border-[#000000] p-1">Impuesto</td>
							<td class="border-r border-[#000000] p-1 text-left">Impuesto de Turismo (5%)</td>
							<td class="border-r border-[#000000] p-1 text-right">${Number(currentTourism).toFixed(2)}</td>
							<td class="border-r border-[#000000] p-1 text-right">$0.00</td>
							<td class="border-r border-[#000000] p-1 text-right">$0.00</td>
							<td class="p-1 text-right">${Number(currentTourism).toFixed(2)}</td>
						</tr>
						{/if}
						<tr class="h-[80px]">
							<td class="border-r border-[#000000] p-1"></td>
							<td class="border-r border-[#000000] p-1"></td>
							<td class="border-r border-[#000000] p-1"></td>
							<td class="border-r border-[#000000] p-1 text-left font-bold text-sm align-top pt-2"><!--NO DEVOLUCIÓN--></td>
							<td class="border-r border-[#000000] p-1"></td>
							<td class="border-r border-[#000000] p-1"></td>
							<td class="border-r border-[#000000] p-1"></td>
							<td class="p-1"></td>
						</tr>
					</tbody>
				</table>

				<!-- Totales -->
				<div class="flex justify-end">
					<table class="w-[280px] text-[10px] border-collapse border-b border-l border-r border-[#000000] text-right">
						<tbody>
							{#if isFiscalCredit}
								<tr>
									<td class="border-r border-b border-[#000000] p-1 w-[184px]">Suma de Ventas:</td>
									<td class="p-1 border-b border-[#000000] w-[96px]">${Number(currentSubtotal).toFixed(2)}</td>
								</tr>
								<tr>
									<td class="border-r border-b border-[#000000] p-1 font-bold">IVA 13%:</td>
									<td class="p-1 border-b border-[#000000]">${Number(currentIva).toFixed(2)}</td>
								</tr>
								<tr>
									<td class="border-r border-b border-[#000000] p-1 font-bold">Sub-Total:</td>
									<td class="p-1 border-b border-[#000000]">${(Number(currentSubtotal) + Number(currentIva)).toFixed(2)}</td>
								</tr>
							{:else}
								<tr>
									<td class="border-r border-b border-[#000000] p-1 w-[184px]">Ventas Gravadas:</td>
									<td class="p-1 border-b border-[#000000] w-[96px]">${(Number(currentSubtotal) + Number(currentIva)).toFixed(2)}</td>
								</tr>
								<tr>
									<td class="border-r border-b border-[#000000] p-1">Sub-Total:</td>
									<td class="p-1 border-b border-[#000000]">${(Number(currentSubtotal) + Number(currentIva)).toFixed(2)}</td>
								</tr>
							{/if}
							
							{#if currentTourism > 0}
							<tr>
								<td class="border-r border-b border-[#000000] p-1 font-bold">Impuesto de Turismo (5%):</td>
								<td class="p-1 border-b border-[#000000]">${Number(currentTourism).toFixed(2)}</td>
							</tr>
							{/if}

							<tr>
								<td class="border-r border-b border-[#000000] p-1 font-bold">IVA Retenido :</td>
								<td class="p-1 border-b border-[#000000]">$0.00</td>
							</tr>
							<tr>
								<td class="border-r border-b border-[#000000] p-1 font-bold">Monto Total de la Operación:</td>
								<td class="p-1 border-b border-[#000000]">${Number(payment.amount).toFixed(2)}</td>
							</tr>
							<tr>
								<td class="border-r border-[#000000] p-1 font-bold text-xs">Total a Pagar:</td>
								<td class="p-1 font-bold text-xs">${Number(payment.amount).toFixed(2)}</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<!-- Observaciones Box -->
			<div class="border border-[#000000] rounded-xl p-3 text-[10px] leading-tight mb-4 min-h-[100px]">
				<p class="mb-2"><span class="font-bold">Valor en Letras:</span> {numeroALetras(Number(payment.amount))}</p>
				<p class="mb-2"><span class="font-bold">Condición de la Operación:</span> CONTADO</p>
				<p class="mb-4"><span class="font-bold">Observaciones:</span> PAGO EN LINEA - {payment.method.toUpperCase()}</p>
				
				<p class="mb-1"><span class="font-bold">No. Referencia:</span> {payment.id}</p>
				<p><span class="font-bold">No. Autorización:</span> {Math.floor(100000 + Math.random() * 900000)}</p>
			</div>

			<!-- Pie de pagina -->
			<div class="flex justify-between text-[10px] font-bold">
				<div>Responsable por parte del emisor: {hotelInfo.name.toUpperCase() + (hotelInfo.name.toUpperCase().includes('S.A.') ? '' : ' S.A. DE C.V.')}</div>
				<div>Nº de Documento: {payment.id}</div>
			</div>
			
			<div class="absolute bottom-4 right-8 text-[9px] font-bold">
				Página 1 de 1
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background-color: #f1f5f9;
	}
	
	.dte-paper {
		width: 210mm; /* A4 width */
		min-height: 297mm; /* A4 height */
		padding: 15mm;
		box-sizing: border-box;
		font-family: Arial, Helvetica, sans-serif;
	}

	@media print {
		:global(body *) {
			visibility: hidden;
		}
		
		:global(html), :global(body), :global(.admin-wrapper), :global(.protected-layout), :global(.protected-main) {
			overflow: visible !important;
			height: auto !important;
			background-color: white !important;
		}
		
		@page {
			size: letter;
			margin: 0;
		}

		.dte-paper, .dte-paper * {
			visibility: visible;
		}

		.dte-paper {
			position: absolute;
			left: 0;
			top: 0;
			width: 100%;
			box-shadow: none !important;
			margin: 0;
			padding: 10mm;
			page-break-after: avoid;
		}
	}
</style>
