# 🏨 AFE Resort & Spa — Portal Frontend

> **Plataforma Web de Gestión Hotelera y Experiencia de Huéspedes**
>
> Diseñado bajo una estética visual de alta gama, arquitectura financiera de triple vía y cumplimiento tributario estricto de facturación electrónica (**DTE**) en El Salvador (`es-SV`).

---

## 🌟 Vista General del Proyecto

Este frontend representa la interfaz del cliente y el panel administrativo del resort de lujo **AFE Resort & Spa**. La interfaz ha sido desarrollada con un enfoque de excelencia visual, micro-animaciones fluidas, diseño totalmente adaptativo (Mobile-First) y carga interactiva de datos en tiempo real.

```mermaid
graph TD
    UI["Frontend (Svelte 5 + Tailwind v4)"]
    UI --> H["Portal del Huésped (Reservaciones, Perfil, Pasarela)"]
    UI --> A["Panel de Administración (Gestión, KPIs, Auditoría)"]
    
    A --> FT["Triple Vía Financiera (Alojamiento, Extras, Incidentales)"]
    A --> DTE["Visor de DTE Facturación Electrónica"]
    A --> REP["Gráficos de Inteligencia de Negocio"]
```

---

## 🛠️ Arquitectura Tecnológica (Tech Stack)

La aplicación utiliza tecnologías modernas para garantizar la máxima velocidad de carga (Core Web Vitals), modularidad limpia y un desarrollo robusto orientado a tipado estricto:

*   **Núcleo del Framework**: [Svelte 5](https://svelte.dev/) utilizando el nuevo sistema de reactividad reactiva y eficiente: **Runes** (`$state`, `$derived`, `$effect`, `$props`).
*   **Enrutador y Server Rendering**: [SvelteKit 2](https://kit.svelte.dev/) con enrutamiento basado en archivos y pre-carga inteligente de datos.
*   **Motor de Estilizado**: [Tailwind CSS v4](https://tailwindcss.com/) para estilos atómicos veloces y fluidos.
*   **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) para un tipado estricto que previene errores en compilación.
*   **Iconografía**: [Lucide Svelte](https://lucide.dev/guide/svelte) para iconos vectoriales limpios y homogéneos de marca.
*   **Generación de Documentos**: [jsPDF](https://github.com/parallax/jsPDF) y [html2pdf.js](https://rawgit.com/eKoopmans/html2pdf/master/README.md) para la generación de reportes financieros en PDF de alta fidelidad.

---

## 💎 Características Principales del Portal

### 1. Sistema de Triple Vía Financiera y Condonaciones
Manejo independiente de los tres flujos de ingresos del hotel para resguardar la consistencia contable:
*   **Alojamiento (`total_cost`)**: Costo base del hospedaje con impuestos aplicables.
*   **Servicios Extras (`extras_total`)**: Consumo de amenidades del catálogo del hotel (masajes, desayunos, tours).
*   **Cargos Incidentales (`incidentals_total`)**: Registro ad-hoc manual de cargos (daños, minibar) con capacidad de adjuntar fotos de evidencia de Cloudinary y condonaciones justificadas con snippets de Svelte 5.
*   **Visualización en Neto y Bruto**: Los KPIs y gráficos del panel financiero se calculan de manera simétrica permitiendo alternar al instante entre valor neto (base sin impuestos) e importe bruto (cobrado con IVA).

### 2. Pasarela de Pagos Multicanal
*   **Wompi Integrado**: Redireccionamientos seguros a la pasarela oficial Wompi de El Salvador con generación en tiempo real de links de pago protegidos.
*   **Transferencia Bancaria**: Módulo de carga interactiva de comprobantes de depósito para verificación de administradores.

### 3. Facturación Electrónica (DTE El Salvador)
*   Integración directa con el Ministerio de Hacienda para facturación de Consumidor Final y Crédito Fiscal.
*   **Imputación Pro-Rata**: Distribución secuencial de abonos parciales entre conceptos del folio para evitar descuadres aritméticos.
*   **Desglose Dinámico de Ítems**: El visor web de DTE (`/admin/pagos/[id]/dte`) renderiza en tiempo real los conceptos cubiertos por la transacción, aplicando IVA (13%) y Turismo (5%) de manera dinámica según las configuraciones del servidor en lugar de usar valores fijos en el código.

### 4. Inteligencia de Negocio y Reportes Financieros
*   **Tendencia de Ventas Separada**: Gráfico de líneas vectorial SVG interactivo que separa el Alojamiento, Servicios Extras y Cargos Incidentales en tres curvas dinámicas (`Línea Dorada`, `Cobriza` y `Esmeralda`) con tooltip flotante de hover.
*   **ADR & RevPAR Dinámico**: Cálculo al instante de métricas clave hoteleras.
*   **Libro Auxiliar Diario**: Tabla interactiva de transacciones diarias ordenadas cronológicamente de forma descendente, destacando la fecha de hoy con un borde de oro y la etiqueta premium `[Hoy]`.
*   **Exportación Premium**: Botones vectoriales de exportación a archivos CSV y PDF con alineación y justificación milimétrica.

---

## 🇸🇻 Estándares de Localización Oficial (El Salvador)

El sistema ha sido estructurado siguiendo estrictamente las regulaciones y formatos del mercado salvadoreño:
*   **Código de Locale**: `es-SV`
*   **Moneda Oficial**: USD ($) con coma para miles y punto para decimales (ej: `$1,250.75`).
*   **Formato de Fechas**: `DD/MM/YYYY` (ej: `29/05/2026`).
*   **Formato de Horas**: 12 horas con AM/PM (ej: `3:45 PM`).
*   **Zona Horaria**: `America/El_Salvador` (GMT-6, sin cambio de horario).
*   **Formato Telefónico**: `+503 XXXX-XXXX` validado en tiempo real con la librería `libphonenumber-js`.
*   **Tasas de Impuesto**: IVA 13% e Impuesto de Turismo 5% cargados de forma dinámica.

---

## 🚀 Configuración e Instalación

Tienes tres opciones para ejecutar el portal frontend según tu rol y las necesidades de desarrollo:

---

### Opción A: Entorno Completo con Docker (Recomendado para Full-Stack)
Si deseas levantar la base de datos SQL Server, el backend y el frontend de forma integrada y local:

1. Asegúrate de tener los repositorios `backend-FastApi` y `proyecto-frontend` clonados uno al lado del otro en el mismo directorio.
2. **Configura los archivos `.env`**:
   - En **`proyecto-frontend`**, copia el archivo `.env.example` y renómbralo como `.env` (deja `VITE_API_URL=http://localhost:8000` por defecto).
   - En **`backend-FastApi`**, copia el archivo `.env.example`, renómbralo como `.env` y llénalo con las credenciales de desarrollo.
3. Abre tu terminal en la carpeta del backend:
   ```bash
   cd ../backend-FastApi
   ```
4. Ejecuta el orquestador:
   ```bash
   docker compose up --build
   ```
5. El portal frontend estará disponible automáticamente en tu navegador en: [http://localhost:5173](http://localhost:5173)

---

### Opción B: Desarrollar Frontend Apuntando a Backend Remoto (Recomendado para Maquetadores/Diseñadores)
Si el backend del proyecto ya está desplegado en un servidor en internet (ej. Railway, Render, etc.) y no deseas instalar Docker ni clonar el código del backend en tu máquina:

1. Clona únicamente este repositorio (`proyecto-frontend`) e ingresa a la carpeta.
2. Instala las dependencias de node:
   ```bash
   npm install
   ```
3. Crea un archivo `.env` en la raíz de esta carpeta y cambia `VITE_API_URL` para que apunte a la dirección del servidor en internet:
   ```env
   # .env
   VITE_API_URL=https://tu-api-desplegada.com
   ```
4. Inicia el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
5. Accede desde: [http://localhost:5173](http://localhost:5173). Tu frontend local consumirá la base de datos y endpoints en internet de forma automática.

---

### Opción C: Instalación Tradicional Local (Sin Docker)
Si deseas ejecutar solo el frontend en tu computadora pero conectándote a un backend que tienes corriendo localmente de forma tradicional:

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Crea el archivo `.env` en la raíz de esta carpeta apuntando a tu puerto local:
   ```env
   # .env
   VITE_API_URL=http://localhost:8000
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Accede en tu navegador a: [http://localhost:5173/](http://localhost:5173/)

---

## 📦 Construcción para Producción

Para compilar la aplicación optimizada para producción:

```sh
# Genera el bundle de producción en la carpeta .svelte-kit
npm run build
```

Puedes previsualizar el bundle de producción compilado localmente ejecutando:
```sh
npm run preview
```

---

## 📁 Estructura del Proyecto

```bash
proyecto-frontend/
├── src/
│   ├── lib/                  # Código modular reutilizable
│   │   ├── components/       # Componentes de UI (Reportes, Tooltips, KPIs)
│   │   ├── services/         # Consumo de APIs (pagos, reservaciones, incidentales)
│   │   └── utils/            # Utilidades y exportaciones PDF/CSV
│   ├── routes/               # Enrutamiento basado en directorios (SvelteKit)
│   │   ├── (protected)/admin # Rutas exclusivas del Staff y Gerencia
│   │   │   ├── pagos/        # Listado de cobros, KPIs premium y visor DTE
│   │   │   ├── reservaciones/# Control de reservaciones y cargos incidentales
│   │   │   └── reportes/     # Panel de Inteligencia Financiera y Gráficos SVG
│   │   ├── (user)/           # Portal del Huésped (pagos, perfil)
│   │   └── +layout.svelte    # Layout base de navegación del portal
│   └── app.html              # Archivo HTML raíz de la aplicación
├── static/                   # Recursos estáticos (Logotipos de Hacienda, Imágenes de Marca)
├── svelte.config.js          # Configuración del compilador Svelte
├── tailwind.config.js        # Configuración del tema visual de Tailwind
├── vite.config.ts            # Configuración de compilación de Vite
└── tsconfig.json             # Ajustes de TypeScript
```

---

