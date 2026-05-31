/**
 * Utilidades de exportación para descargas de reportes en formato CSV y PDF.
 */

/**
 * Genera y descarga un archivo CSV a partir de datos estructurados.
 * Agrega el carácter BOM UTF-8 (\uFEFF) para compatibilidad perfecta con Excel y caracteres con tildes/eñes.
 */
export function downloadCSV(
	headers: string[],
	rows: (string | number | boolean | null | undefined)[][],
	filename: string
): void {
	if (typeof window === 'undefined') return;

	// Escape double quotes and wrap in quotes if necessary
	const formatCell = (val: any): string => {
		if (val === null || val === undefined) return '';
		const str = String(val);
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	};

	const csvContent = [
		headers.map(formatCell).join(','),
		...rows.map(row => row.map(formatCell).join(','))
	].join('\n');

	// UTF-8 BOM
	const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

/**
 * Convierte un color de espacio OKLCH (usado por Tailwind CSS v4) a RGBA estándar compatible con html2canvas.
 * Realiza conversiones matemáticas exactas: OKLCH -> OKLAB -> XYZ -> Linear sRGB -> sRGB (gamma-corrected).
 */
function oklchToRgb(oklchStr: string): string {
	try {
		// Regex para parsear oklch(L C H) o oklch(L C H / alpha)
		const match = oklchStr.match(/oklch\(\s*([0-9.%]+)\s+([0-9.%]+)\s+([0-9.degrad%]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/i);
		if (!match) return oklchStr;

		let L = parseFloat(match[1]);
		if (match[1].includes('%')) L /= 100;

		let C = parseFloat(match[2]);
		if (match[2].includes('%')) C = (C / 100) * 0.4; // Chroma aproximado máximo en sRGB

		let HStr = match[3];
		let H = parseFloat(HStr);
		if (HStr.includes('rad')) {
			H = H * (180 / Math.PI);
		} else if (HStr.includes('turn')) {
			H = H * 360;
		}

		let A = 1;
		if (match[4]) {
			let AStr = match[4];
			A = parseFloat(AStr);
			if (AStr.includes('%')) A /= 100;
		}

		// 1. OKLCH -> OKLAB
		const hRad = H * Math.PI / 180;
		const a = C * Math.cos(hRad);
		const bLab = C * Math.sin(hRad);

		// 2. OKLAB -> XYZ (lineal)
		const l_ = L + 0.3963377774 * a + 0.2158037573 * bLab;
		const m_ = L - 0.1055613458 * a - 0.0638541728 * bLab;
		const s_ = L - 0.0894841775 * a - 1.2914855480 * bLab;

		const l = Math.pow(Math.max(0, l_), 3);
		const m = Math.pow(Math.max(0, m_), 3);
		const s = Math.pow(Math.max(0, s_), 3);

		const X = +1.2270138511 * l - 0.5577999807 * m + 0.3307861316 * s;
		const Y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s;
		const Z = -0.0763812845 * l - 0.4214819784 * m + 1.4978639530 * s;

		// 3. XYZ -> Linear sRGB
		const rLinear = +3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
		const gLinear = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
		const bLinear = +0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

		// 4. Linear sRGB -> sRGB estándar (corrección de gama)
		const gamma = (c: number) => {
			return c <= 0.0031308
				? 12.92 * c
				: 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
		};

		const r = Math.round(Math.min(255, Math.max(0, gamma(rLinear) * 255)));
		const g = Math.round(Math.min(255, Math.max(0, gamma(gLinear) * 255)));
		const b = Math.round(Math.min(255, Math.max(0, gamma(bLinear) * 255)));

		return `rgba(${r}, ${g}, ${b}, ${A})`;
	} catch (e) {
		console.warn('Fallo al convertir color oklch:', oklchStr, e);
		return 'rgba(212, 175, 55, 1)'; // Fallback al dorado premium AFE en caso de error
	}
}

/**
 * Convierte un color de espacio OKLAB (usado por Tailwind CSS v4) a RGBA estándar compatible con html2canvas.
 * Realiza conversiones matemáticas exactas: OKLAB -> XYZ -> Linear sRGB -> sRGB (gamma-corrected).
 */
function oklabToRgb(oklabStr: string): string {
	try {
		// Regex para parsear oklab(L a b) o oklab(L a b / alpha)
		const match = oklabStr.match(/oklab\(\s*([0-9.%]+)\s+([\-0-9.%]+)\s+([\-0-9.%]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/i);
		if (!match) return oklabStr;

		let L = parseFloat(match[1]);
		if (match[1].includes('%')) L /= 100;

		let a = parseFloat(match[2]);
		if (match[2].includes('%')) a = (a / 100) * 0.4;

		let bLab = parseFloat(match[3]);
		if (match[3].includes('%')) bLab = (bLab / 100) * 0.4;

		let A = 1;
		if (match[4]) {
			A = parseFloat(match[4]);
			if (match[4].includes('%')) A /= 100;
		}

		// 1. OKLAB -> XYZ (lineal)
		const l_ = L + 0.3963377774 * a + 0.2158037573 * bLab;
		const m_ = L - 0.1055613458 * a - 0.0638541728 * bLab;
		const s_ = L - 0.0894841775 * a - 1.2914855480 * bLab;

		const l = Math.pow(Math.max(0, l_), 3);
		const m = Math.pow(Math.max(0, m_), 3);
		const s = Math.pow(Math.max(0, s_), 3);

		const X = +1.2270138511 * l - 0.5577999807 * m + 0.3307861316 * s;
		const Y = -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s;
		const Z = -0.0763812845 * l - 0.4214819784 * m + 1.4978639530 * s;

		// 2. XYZ -> Linear sRGB
		const rLinear = +3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
		const gLinear = -0.9692660 * X + 1.8760108 * Y + 0.0415560 * Z;
		const bLinear = +0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

		// 3. Linear sRGB -> sRGB estándar (corrección de gama)
		const gamma = (c: number) => {
			return c <= 0.0031308
				? 12.92 * c
				: 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
		};

		const r = Math.round(Math.min(255, Math.max(0, gamma(rLinear) * 255)));
		const g = Math.round(Math.min(255, Math.max(0, gamma(gLinear) * 255)));
		const bVal = Math.round(Math.min(255, Math.max(0, gamma(bLinear) * 255)));

		return `rgba(${r}, ${g}, ${bVal}, ${A})`;
	} catch (e) {
		console.warn('Fallo al convertir color oklab:', oklabStr, e);
		return 'rgba(212, 175, 55, 1)'; // Fallback al dorado premium AFE en caso de error
	}
}

/**
 * Genera y descarga un archivo PDF de un contenedor DOM específico utilizando html2pdf.js.
 * Resuelve temporalmente la incompatibilidad de Tailwind CSS v4 / oklch() con html2canvas interceptando getComputedStyle.
 */
export async function downloadPDF(elementId: string, filename: string): Promise<void> {
	if (typeof window === 'undefined') return;

	const element = document.getElementById(elementId);
	if (!element) {
		throw new Error(`Elemento con ID "${elementId}" no encontrado.`);
	}

	let html2pdf: any = null;

	// 1. Cargar la librería local o remota
	try {
		const localModule = await import('html2pdf.js');
		html2pdf = localModule.default || localModule;
		if (typeof html2pdf !== 'function' && (html2pdf as any).default) {
			html2pdf = (html2pdf as any).default;
		}
	} catch (localError) {
		console.warn('No se cargó html2pdf de forma local. Intentando inyección de CDN.');
	}

	if (!html2pdf || typeof html2pdf !== 'function') {
		const loadScript = (src: string): Promise<void> => {
			return new Promise((resolve, reject) => {
				if ((window as any).html2pdf) {
					resolve();
					return;
				}
				const script = document.createElement('script');
				script.src = src;
				script.async = true;
				script.onload = () => resolve();
				script.onerror = () => reject(new Error('Bloqueo o fallo de conexión al descargar script del CDN.'));
				document.head.appendChild(script);
			});
		};

		try {
			await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
			html2pdf = (window as any).html2pdf;
		} catch (cdnError: any) {
			throw new Error(`Dependencias: No se pudo cargar html2pdf de forma local ni remota (${cdnError.message})`);
		}
	}

	// 3. Inyectar MONKEY-PATCH de getComputedStyle para traducir oklch() a RGBA en tiempo de ejecución
	const originalGetComputedStyle = window.getComputedStyle;
	
	const convertModernColors = (val: any): any => {
		if (typeof val !== 'string') return val;
		const lower = val.toLowerCase();
		// Reemplaza oklch(...) y oklab(...) por su equivalente RGBA compatible con html2canvas
		if (lower.includes('oklch') || lower.includes('oklab')) {
			let result = val;
			result = result.replace(/oklch\([^)]+\)/gi, (m: string) => oklchToRgb(m));
			result = result.replace(/oklab\([^)]+\)/gi, (m: string) => oklabToRgb(m));
			return result;
		}
		return val;
	};

	window.getComputedStyle = function(el, pseudoElt) {
		const style = originalGetComputedStyle.call(window, el, pseudoElt);
		
		// Creamos un proxy para interceptar accesos a propiedades directas (ej: style.color) o via getPropertyValue
		return new Proxy(style, {
			get(target, prop) {
				if (prop === 'getPropertyValue') {
					return function(propertyName: string) {
						const originalValue = target.getPropertyValue(propertyName);
						return convertModernColors(originalValue);
					};
				}
				
				const value = Reflect.get(target, prop);
				if (typeof value === 'function') {
					return value.bind(target);
				}
				return convertModernColors(value);
			}
		});
	};

	try {
		element.classList.add('pdf-printing');

		const options = {
			margin: [12, 12, 16, 12],
			filename: filename,
			image: { type: 'jpeg', quality: 0.98 },
			html2canvas: { 
				scale: 2, 
				useCORS: true, 
				logging: false,
				backgroundColor: '#0B0E14',
				windowWidth: 1200
			},
			jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
		};

		// Generar y descargar el PDF con los estilos interceptados
		await html2pdf().set(options).from(element).save();
		
		// Limpieza de estilos e inyección
		element.classList.remove('pdf-printing');
		window.getComputedStyle = originalGetComputedStyle;
	} catch (renderError: any) {
		// Asegurar la restauración en caso de error
		window.getComputedStyle = originalGetComputedStyle;
		if (element) {
			element.classList.remove('pdf-printing');
		}
		console.error('Error durante renderizado de PDF:', renderError);
		throw new Error(`Error de Renderizado: ${renderError.message || String(renderError)}`);
	}
}

export interface HotelInfo {
	name: string;
	phone?: string;
	email?: string;
}

/**
 * Genera y descarga un reporte PDF Vectorial Puro y estructurado con textos reales y seleccionables.
 * Utiliza llamadas directas a la API de jsPDF para lograr una impresión de nivel corporativo.
 */
export async function downloadVectorPDF(
	reportType: 'summary' | 'financial' | 'occupancy' | 'customers' | 'extras',
	dateRangeStr: string,
	summaryData: any,
	detailsData: any,
	hotelInfo?: HotelInfo
): Promise<void> {
	if (typeof window === 'undefined') return;

	// Cargar jsPDF de forma dinámica para evitar problemas con SSR en SvelteKit
	let jsPDFClass: any = null;
	try {
		const { jsPDF } = await import('jspdf');
		jsPDFClass = jsPDF;
	} catch (e) {
		console.error("No se pudo importar jsPDF de forma local. Intentando cargar del CDN.");
		if ((window as any).jspdf && (window as any).jspdf.jsPDF) {
			jsPDFClass = (window as any).jspdf.jsPDF;
		} else {
			throw new Error("No se pudo cargar la librería jsPDF. Asegúrese de que esté instalada.");
		}
	}

	const doc = new jsPDFClass({ orientation: 'p', unit: 'mm', format: 'a4' });

	// Extraer información dinámica del hotel
	const hotel = hotelInfo || { name: 'AFE Resort & Spa', phone: '', email: '' };
	const hotelName = hotel.name || 'AFE Resort & Spa';
	
	// Generar prefijo sanitizando el nombre
	const hotelPrefix = hotelName.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 15);
	
	// Generar iniciales para el logo
	let hotelAbbr = 'AFE';
	if (hotelName !== 'AFE Resort & Spa') {
		const words = hotelName.split(/\s+/).filter(w => w.length > 2);
		if (words.length >= 2) {
			hotelAbbr = words.map(w => w[0]).join('').toUpperCase().substring(0, 4);
		} else {
			hotelAbbr = hotelName.substring(0, 3).toUpperCase();
		}
	}

	// Nombre del archivo de descarga
	const sanitizedRange = dateRangeStr.replace(/\//g, '-').replace(/\s+/g, '_');
	const filename = `${hotelPrefix}_Reporte_${reportType.toUpperCase()}_${sanitizedRange}.pdf`;

	// Helpers de formateo
	const formatMoney = (val: any) => {
		const num = parseFloat(val);
		if (isNaN(num)) return '$0.00';
		return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	};

	const formatPercent = (val: any) => {
		const num = parseFloat(val);
		if (isNaN(num)) return '0.0%';
		return num.toFixed(1) + '%';
	};

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '';
		try {
			// Separar YYYY-MM-DD para evitar corrupciones de zona horaria local
			const parts = dateStr.split('T')[0].split('-');
			if (parts.length === 3) {
				return `${parts[2]}/${parts[1]}/${parts[0]}`;
			}
			return new Date(dateStr).toLocaleDateString('es-SV');
		} catch (e) {
			return dateStr;
		}
	};

	// Lista de páginas y numeración diferida
	let pageCount = 0;
	const drawHeaderAndFooter = (reportTitleStr: string) => {
		pageCount++;
		
		// 1. HEADER
		// Logo vectorial dorado
		doc.setFillColor(212, 175, 85);
		doc.circle(21, 18, 6, 'F');
		
		doc.setTextColor(255, 255, 255);
		doc.setFont('times', 'bold');
		doc.setFontSize(10);
		doc.text(hotelAbbr, 21, 19.5, { align: 'center' });
		
		// Texto de membrete
		doc.setTextColor(11, 14, 20);
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(14);
		doc.text(hotelName.toUpperCase(), 30, 16);
		
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8.5);
		doc.setTextColor(100, 116, 139);
		doc.text('Sistema de Inteligencia de Negocios y Analítica', 30, 21);
		
		// Línea dorada superior
		doc.setDrawColor(212, 175, 85);
		doc.setLineWidth(0.5);
		doc.line(15, 25, 195, 25);
		
		// Metadatos
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(9);
		doc.setTextColor(51, 65, 85);
		doc.text(`REPORTE: ${reportTitleStr.toUpperCase()}`, 15, 32);
		
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8.5);
		doc.text(`Período: ${dateRangeStr}`, 195, 32, { align: 'right' });
		
		doc.text(`Generado: ${new Date().toLocaleString('es-SV')}`, 15, 37);
		doc.text(`Operador: Administrador ${hotelAbbr}`, 195, 37, { align: 'right' });
		
		// Línea divisoria gris
		doc.setDrawColor(226, 232, 240);
		doc.setLineWidth(0.2);
		doc.line(15, 40, 195, 40);
	};

	const drawFooterText = (pageNum: number, totalPages: number) => {
		doc.setDrawColor(226, 232, 240);
		doc.setLineWidth(0.2);
		doc.line(15, 282, 195, 282);
		
		if (hotel.phone || hotel.email) {
			doc.setFont('helvetica', 'normal');
			doc.setFontSize(7);
			doc.setTextColor(148, 163, 184);
			const contactParts = [hotel.phone, hotel.email].filter(Boolean);
			doc.text(`Contacto: ${contactParts.join(' | ')}`, 15, 280);
		}
		
		doc.setFont('helvetica', 'italic');
		doc.setFontSize(7.5);
		doc.setTextColor(148, 163, 184);
		doc.text(`Documento oficial confidencial de auditoría operativa - ${hotelName}`, 15, 287);
		doc.text(`Página ${pageNum} de ${totalPages}`, 195, 287, { align: 'right' });
	};

	let reportTitle = '';
	let kpis: { label: string; value: string; growth: number | null }[] = [];

	// Extraer KPIs y configurar título según el reporte
	if (reportType === 'summary') {
		reportTitle = 'Resumen Ejecutivo de Operaciones';
		const sum = summaryData || {};
		kpis = [
			{ label: 'Ingresos Netos', value: formatMoney(sum.total_revenue), growth: sum.revenue_growth_pct ?? null },
			{ label: 'Ocupación Media', value: formatPercent(sum.occupancy_rate), growth: null },
			{ label: 'ADR (Tarifa Promedio)', value: formatMoney(sum.adr), growth: null },
			{ label: 'Total Reservaciones', value: String(sum.total_reservations ?? 0), growth: null }
		];
	} else if (reportType === 'financial') {
		reportTitle = 'Reporte de Desempeño Financiero';
		const fin = detailsData || {};
		kpis = [
			{ label: 'Ingresos Totales', value: formatMoney(fin.total_revenue || summaryData?.total_revenue), growth: fin.revenue_growth ?? summaryData?.revenue_growth_pct },
			{ label: 'Ingresos por Habitaciones', value: formatMoney(fin.room_revenue), growth: null },
			{ label: 'Ingresos por Extras', value: formatMoney(fin.extra_revenue), growth: null },
			{ label: 'Ingresos por Incidentales', value: formatMoney(fin.incidental_revenue || 0), growth: null },
			{ label: 'Tarifa Promedio (ADR)', value: formatMoney(fin.adr || summaryData?.adr), growth: null },
			{ label: 'RevPAR', value: formatMoney(fin.rev_par || summaryData?.rev_par), growth: null }
		];
	} else if (reportType === 'occupancy') {
		reportTitle = 'Reporte Analítico de Ocupación';
		const occ = detailsData || {};
		kpis = [
			{ label: 'Tasa Ocupación Media', value: formatPercent(occ.occupancy_rate ?? summaryData?.occupancy_rate), growth: null },
			{ label: 'Noches Vendidas', value: String(occ.total_nights_sold ?? summaryData?.total_reservations ?? 0), growth: null },
			{ label: 'ADR (Tarifa Promedio)', value: formatMoney(occ.adr ?? summaryData?.adr), growth: null },
			{ label: 'RevPAR', value: formatMoney(occ.revpar ?? summaryData?.rev_par), growth: null }
		];
	} else if (reportType === 'customers') {
		reportTitle = 'Reporte de Segmentación de Clientes';
		const cust = detailsData || {};
		kpis = [
			{ label: 'Clientes Únicos', value: String(cust.total_customers ?? 0), growth: null },
			{ label: 'Huéspedes Nuevos', value: String(cust.new_customers ?? 0), growth: null },
			{ label: 'Tasa de Recurrencia', value: formatPercent(cust.returning_customers_pct), growth: null },
			{ label: 'Gasto Promedio', value: formatMoney(cust.avg_spent_per_customer), growth: null }
		];
	} else if (reportType === 'extras') {
		reportTitle = 'Reporte de Amenidades y Extras';
		const ext = detailsData || {};
		kpis = [
			{ label: 'Ingresos Extras', value: formatMoney(ext.total_extra_revenue), growth: null },
			{ label: 'Unidades Vendidas', value: String(ext.total_extras_sold ?? 0), growth: null },
			{ label: 'Gasto Promedio', value: formatMoney(ext.avg_extra_spent_per_res), growth: null }
		];
	}

	// 1. Dibujar primera página encabezados y KPIs
	drawHeaderAndFooter(reportTitle);

	let y = 46;

	// Dibujar KPIs
	if (kpis.length > 0) {
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(10);
		doc.setTextColor(15, 23, 42);
		doc.text('RESUMEN EJECUTIVO (KPIs)', 15, y);
		y += 4;

		if (kpis.length === 4) {
			// Cuadrícula 2x2
			const boxW = 85;
			const boxH = 15;
			
			// Fila 1
			// Box 1
			doc.setFillColor(248, 250, 252); doc.rect(15, y, boxW, boxH, 'F');
			doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.rect(15, y, boxW, boxH, 'D');
			doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.text(kpis[0].label.toUpperCase(), 19, y + 4.5);
			doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.text(kpis[0].value, 19, y + 11);
			if (kpis[0].growth !== null) {
				const g = kpis[0].growth;
				doc.setTextColor(g >= 0 ? 22 : 220, g >= 0 ? 163 : 38, g >= 0 ? 74 : 38);
				doc.setFontSize(8); doc.text(g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`, 15 + boxW - 4, y + 11, { align: 'right' });
			}

			// Box 2
			doc.setFillColor(248, 250, 252); doc.rect(110, y, boxW, boxH, 'F');
			doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.rect(110, y, boxW, boxH, 'D');
			doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.text(kpis[1].label.toUpperCase(), 114, y + 4.5);
			doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.text(kpis[1].value, 114, y + 11);
			if (kpis[1].growth !== null) {
				const g = kpis[1].growth;
				doc.setTextColor(g >= 0 ? 22 : 220, g >= 0 ? 163 : 38, g >= 0 ? 74 : 38);
				doc.setFontSize(8); doc.text(g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`, 110 + boxW - 4, y + 11, { align: 'right' });
			}

			y += 18;

			// Fila 2
			// Box 3
			doc.setFillColor(248, 250, 252); doc.rect(15, y, boxW, boxH, 'F');
			doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.rect(15, y, boxW, boxH, 'D');
			doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.text(kpis[2].label.toUpperCase(), 19, y + 4.5);
			doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.text(kpis[2].value, 19, y + 11);
			if (kpis[2].growth !== null) {
				const g = kpis[2].growth;
				doc.setTextColor(g >= 0 ? 22 : 220, g >= 0 ? 163 : 38, g >= 0 ? 74 : 38);
				doc.setFontSize(8); doc.text(g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`, 15 + boxW - 4, y + 11, { align: 'right' });
			}

			// Box 4
			doc.setFillColor(248, 250, 252); doc.rect(110, y, boxW, boxH, 'F');
			doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.rect(110, y, boxW, boxH, 'D');
			doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.text(kpis[3].label.toUpperCase(), 114, y + 4.5);
			doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.text(kpis[3].value, 114, y + 11);
			if (kpis[3].growth !== null) {
				const g = kpis[3].growth;
				doc.setTextColor(g >= 0 ? 22 : 220, g >= 0 ? 163 : 38, g >= 0 ? 74 : 38);
				doc.setFontSize(8); doc.text(g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`, 110 + boxW - 4, y + 11, { align: 'right' });
			}

			y += 18;
		} else if (kpis.length === 3) {
			// Una fila con 3 cajas
			const boxW = 56;
			const boxH = 15;
			
			for (let i = 0; i < 3; i++) {
				const bx = 15 + i * 62;
				doc.setFillColor(248, 250, 252); doc.rect(bx, y, boxW, boxH, 'F');
				doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.rect(bx, y, boxW, boxH, 'D');
				doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.text(kpis[i].label.toUpperCase(), bx + 4, y + 4.5);
				doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.text(kpis[i].value, bx + 4, y + 11);
				if (kpis[i].growth !== null) {
					const g = kpis[i].growth;
					doc.setTextColor(g >= 0 ? 22 : 220, g >= 0 ? 163 : 38, g >= 0 ? 74 : 38);
					doc.setFontSize(8); doc.text(g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`, bx + boxW - 4, y + 11, { align: 'right' });
				}
			}
			y += 18;
		} else if (kpis.length === 6) {
			// Cuadrícula de 3 columnas x 2 filas
			const boxW = 56;
			const boxH = 15;
			
			// Fila 1 (Índices 0, 1, 2)
			for (let i = 0; i < 3; i++) {
				const bx = 15 + i * 62;
				doc.setFillColor(248, 250, 252); doc.rect(bx, y, boxW, boxH, 'F');
				doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.rect(bx, y, boxW, boxH, 'D');
				doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); doc.setTextColor(100, 116, 139); doc.text(kpis[i].label.toUpperCase(), bx + 4, y + 4.5);
				doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(15, 23, 42); doc.text(kpis[i].value, bx + 4, y + 11);
				if (kpis[i].growth !== null) {
					const g = kpis[i].growth;
					doc.setTextColor(g >= 0 ? 22 : 220, g >= 0 ? 163 : 38, g >= 0 ? 74 : 38);
					doc.setFontSize(7.5); doc.text(g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`, bx + boxW - 4, y + 11, { align: 'right' });
				}
			}
			y += 18;

			// Fila 2 (Índices 3, 4, 5)
			for (let i = 3; i < 6; i++) {
				const bx = 15 + (i - 3) * 62;
				doc.setFillColor(248, 250, 252); doc.rect(bx, y, boxW, boxH, 'F');
				doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.2); doc.rect(bx, y, boxW, boxH, 'D');
				doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); doc.setTextColor(100, 116, 139); doc.text(kpis[i].label.toUpperCase(), bx + 4, y + 4.5);
				doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(15, 23, 42); doc.text(kpis[i].value, bx + 4, y + 11);
				if (kpis[i].growth !== null) {
					const g = kpis[i].growth;
					doc.setTextColor(g >= 0 ? 22 : 220, g >= 0 ? 163 : 38, g >= 0 ? 74 : 38);
					doc.setFontSize(7.5); doc.text(g >= 0 ? `+${g.toFixed(1)}%` : `${g.toFixed(1)}%`, bx + boxW - 4, y + 11, { align: 'right' });
				}
			}
			y += 18;
		}
	}

	y += 4;

	// Función reutilizable para renderizar tablas vectorial
	const printTable = (
		tableTitle: string,
		headers: string[],
		widths: number[],
		aligns: string[],
		rows: any[][]
	) => {
		// Chequear espacio libre
		if (y > 230) {
			doc.addPage();
			y = 45;
			drawHeaderAndFooter(reportTitle);
		}

		doc.setFont('helvetica', 'bold');
		doc.setFontSize(9.5);
		doc.setTextColor(15, 23, 42);
		doc.text(tableTitle.toUpperCase(), 15, y);
		
		doc.setDrawColor(212, 175, 85);
		doc.setLineWidth(0.4);
		doc.line(15, y + 2, 195, y + 2);
		
		y += 5;

		// Dibujar cabeceras
		doc.setFillColor(11, 14, 20);
		doc.rect(15, y, 180, 6.5, 'F');
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(7.5);
		doc.setTextColor(255, 255, 255);
		
		let startX = 15;
		for (let i = 0; i < headers.length; i++) {
			const w = widths[i];
			const align = aligns[i];
			const tx = align === 'right' ? startX + w - 2 : align === 'center' ? startX + w / 2 : startX + 2;
			doc.text(headers[i], tx, y + 4.2, { align: align as any });
			startX += w;
		}
		
		y += 6.5;

		// Dibujar filas
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(7.5);
		
		for (let r = 0; r < rows.length; r++) {
			// Comprobar desbordamiento de página
			if (y > 268) {
				doc.addPage();
				y = 45;
				drawHeaderAndFooter(reportTitle);
				
				// Re-imprimir cabeceras
				doc.setFillColor(11, 14, 20);
				doc.rect(15, y, 180, 6.5, 'F');
				doc.setFont('helvetica', 'bold');
				doc.setFontSize(7.5);
				doc.setTextColor(255, 255, 255);
				let sX = 15;
				for (let i = 0; i < headers.length; i++) {
					const w = widths[i];
					const align = aligns[i];
					const tx = align === 'right' ? sX + w - 2 : align === 'center' ? sX + w / 2 : sX + 2;
					doc.text(headers[i], tx, y + 4.2, { align: align as any });
					sX += w;
				}
				y += 6.5;
				doc.setFont('helvetica', 'normal');
				doc.setFontSize(7.5);
			}

			// Fondo alterno
			if (r % 2 === 1) {
				doc.setFillColor(248, 250, 252);
				doc.rect(15, y, 180, 5.5, 'F');
			}

			// Línea inferior sutil
			doc.setDrawColor(241, 245, 249);
			doc.setLineWidth(0.15);
			doc.line(15, y + 5.5, 195, y + 5.5);

			doc.setTextColor(51, 65, 85);
			const rowData = rows[r];
			let curX = 15;
			for (let i = 0; i < rowData.length; i++) {
				const w = widths[i];
				const align = aligns[i];
				let textVal = String(rowData[i] !== null && rowData[i] !== undefined ? rowData[i] : '');

				// Evitar desbordamientos de columnas recortando texto si es necesario
				const maxChars = Math.floor(w * 0.42);
				if (textVal.length > maxChars && align === 'left') {
					textVal = textVal.substring(0, maxChars - 3) + '...';
				}

				const tx = align === 'right' ? curX + w - 2 : align === 'center' ? curX + w / 2 : curX + 2;
				doc.text(textVal, tx, y + 3.8, { align: align as any });
				curX += w;
			}
			y += 5.5;
		}
		
		y += 6; // Espaciado al final de la tabla
	};

	// 2. Renderizar contenido específico del reporte
	if (reportType === 'summary') {
		const sum = summaryData || {};
		const summaryRows = [
			['Ingresos Netos Consolidados', formatMoney(sum.total_revenue), sum.revenue_growth_pct !== null ? `${sum.revenue_growth_pct >= 0 ? '+' : ''}${sum.revenue_growth_pct}%` : 'N/A'],
			['Porcentaje de Ocupación Media', formatPercent(sum.occupancy_rate), 'Estable'],
			['Tarifa Diaria Promedio (ADR)', formatMoney(sum.adr), 'N/A'],
			['Ingreso por Habitación Disponible (RevPAR)', formatMoney(sum.rev_par), 'N/A'],
			['Volumen Total de Reservaciones', String(sum.total_reservations ?? 0), sum.cancellation_rate !== null ? `${sum.cancellation_rate}% canc.` : 'N/A'],
			['Tasa de Cancelación de Reservas', formatPercent(sum.cancellation_rate), sum.cancellation_rate > 10 ? 'Revisar' : 'Saludable']
		];
		printTable(
			'Métricas y KPIs Consolidados del Complejo',
			['MÉTRICA ANALÍTICA', 'VALOR REGISTRADO', 'ESTADO / CRECIMIENTO'],
			[80, 50, 50],
			['left', 'right', 'center'],
			summaryRows
		);
	} else if (reportType === 'financial') {
		const fin = detailsData || {};
		
		// Tabla de Métodos de Pago
		const payRows = (fin.revenue_by_method || []).map((m: any) => [
			String(m.method === 'card' ? 'Tarjeta' : m.method === 'transfer' ? 'Transferencia' : m.method === 'cash' ? 'Efectivo' : m.method === 'refund' ? 'Reembolso' : m.method),
			String(m.count ?? 0),
			formatMoney(m.amount)
		]);
		printTable(
			'Desglose por Métodos de Pago',
			['MÉTODO DE PAGO', 'TRANSACCIONES', 'INGRESO TOTAL'],
			[60, 60, 60],
			['left', 'center', 'right'],
			payRows
		);

		// Tabla de Tendencia Diaria (Desglose impositivo completo)
		const trendRows = (fin.daily_revenue || []).map((t: any) => {
			const roomRevenue = Number(t.room_revenue || 0);
			const tourismTax = roomRevenue * 0.05;
			const ivaTax = Math.max(0, Number(t.tax_revenue || 0) - tourismTax);
			return [
				formatDate(t.date),
				formatMoney(t.room_revenue),
				formatMoney(t.extra_revenue),
				formatMoney(t.incidental_revenue || 0),
				formatMoney(ivaTax),
				formatMoney(tourismTax),
				formatMoney(t.total_revenue)
			];
		});
		printTable(
			'Historial de Ingresos Diarios (Desglose de Caja Neto)',
			['FECHA', 'HABITACIONES', 'EXTRAS', 'INCIDENTALES', 'IVA (13%)', 'TURISMO (5%)', 'TOTAL DIARIO'],
			[25, 25, 25, 25, 25, 25, 30],
			['center', 'right', 'right', 'right', 'right', 'right', 'right'],
			trendRows
		);
	} else if (reportType === 'occupancy') {
		const occ = detailsData || {};

		// Tabla de Tipos de Habitación
		const typeRows = (occ.room_type_occupancy || []).map((t: any) => [
			String(t.room_type),
			String(t.occupied_nights)
		]);
		printTable(
			'Rendimiento por Tipo de Habitación',
			['TIPO DE HABITACIÓN', 'NOCHES VENDIDAS'],
			[90, 90],
			['left', 'center'],
			typeRows
		);

		// Tabla de Ocupación Diaria
		const dailyRows = (occ.occupancy_trend || []).map((d: any) => [
			formatDate(d.date),
			`${d.occupied_rooms} habitaciones ocupadas`
		]);
		printTable(
			'Registro Histórico Diario de Ocupación',
			['FECHA', 'HABITACIONES OCUPADAS'],
			[90, 90],
			['center', 'center'],
			dailyRows
		);
	} else if (reportType === 'customers') {
		const cust = detailsData || {};

		// Tabla de Top Clientes
		const clientRows = (cust.top_customers || []).map((c: any) => [
			String(c.name),
			String(c.email),
			String(c.reservations_count),
			formatMoney(c.total_spent)
		]);
		printTable(
			'Top 10 Huéspedes con Mayor Gasto',
			['HUÉSPED', 'CORREO ELECTRÓNICO', 'RESERVAS', 'TOTAL INVERTIDO'],
			[50, 60, 30, 40],
			['left', 'left', 'center', 'right'],
			clientRows
		);

		// Tabla Geográfica
		const geoRows = (cust.customers_by_country || []).map((g: any) => [
			String(g.country || 'N/A'),
			String(g.count)
		]);
		printTable(
			'Distribución Geográfica de Huéspedes',
			['PAÍS DE ORIGEN', 'CANTIDAD DE HUÉSPEDES'],
			[90, 90],
			['left', 'center'],
			geoRows
		);
	} else if (reportType === 'extras') {
		const ext = detailsData || {};

		// Tabla de Top Extras
		const topRows = (ext.top_extras || []).map((e: any) => [
			String(e.name),
			String(e.category === 'spa' ? 'Spa & Bienestar' : e.category === 'restaurant' ? 'Restaurante' : e.category === 'tours' ? 'Tours & Actividades' : e.category),
			String(e.quantity_sold),
			formatMoney(e.revenue)
		]);
		printTable(
			'Servicios y Amenidades Extras más Vendidas',
			['SERVICIO / AMENIDAD EXTRA', 'CATEGORÍA', 'CANTIDAD VENDIDA', 'INGRESOS TOTALES'],
			[55, 45, 40, 40],
			['left', 'left', 'center', 'right'],
			topRows
		);
	}

	// 3. Estampar la numeración de páginas final y pies de página de forma retroactiva
	const totalPages = pageCount;
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		drawFooterText(i, totalPages);
	}

	// Descargar el documento
	doc.save(filename);
}

