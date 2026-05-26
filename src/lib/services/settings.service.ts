import { API_BASE } from '$lib/config/api';

export interface PublicSettings {
	tax_iva_rate: number;
	tax_tourism_rate: number;
	featured_amenity_filters?: string;
	hero_image_reservations?: string;
	hero_images_rooms?: string;
	featured_rooms_home?: string;

	// Contenido de la Web Pública
	hero_title?: string;
	hero_subtitle?: string;
	hero_video_url?: string;

	esencia_img_main?: string;
	esencia_img_secondary?: string;

	amenity_sig_1_img?: string;
	amenity_sig_1_title?: string;
	amenity_sig_1_desc?: string;

	amenity_sig_2_img?: string;
	amenity_sig_2_title?: string;
	amenity_sig_2_desc?: string;

	amenity_sig_3_img?: string;
	amenity_sig_3_title?: string;
	amenity_sig_3_desc?: string;

	momentos_video_url?: string;
	momentos_img_url?: string;

	social_instagram?: string;
	social_twitter?: string;
	social_facebook?: string;

	faq_items_json?: string;
	map_address?: string;
	map_phone?: string;
	map_email?: string;
	map_hours?: string;
	map_iframe_url?: string;
}

/**
 * Obtiene las configuraciones públicas del sistema (IVA e Impuesto de Turismo)
 * desde el endpoint sin autenticación.
 */
export async function fetchPublicSettings(): Promise<PublicSettings> {
	const res = await fetch(`${API_BASE}/admin/settings/public`);
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.detail ?? 'Error al obtener las configuraciones públicas');
	}
	return await res.json();
}
