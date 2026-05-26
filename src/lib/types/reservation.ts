import type { RoomRead } from './room';

export interface ReservationRead {
	id: number;
	unique_id: string;
	user_id: number;
	room_id: number;
	check_in: string; // date YYYY-MM-DD
	check_out: string;
	guests: number;
	
	subtotal?: number;
	tax_iva?: number;
	tax_tourism?: number;
	total_cost: number;
	grand_total?: number;
	
	total_paid: number;
	balance: number;
	extras_total: number;
	extras_pending: number;
	status: string; // pending, confirmed, cancelled
	created_at: string;
	
	room?: RoomRead;
	user?: {
		id: number;
		email: string;
		profile?: {
			first_name: string;
			last_name: string;
			phone?: string;
			person_type?: string;
			document_type?: string;
			document_number?: string;
			nrc?: string;
			nit?: string;
			economic_activity?: string;
		};
	};
	payments?: Array<{
		id: number;
		amount: number;
		method: string;
		status: string;
		receipt_type: string | null;
		created_at: string;
	}>;
	extras?: Array<{
		id: number;
		extra_amenity_id: number;
		extra_amenity: {
			id: number;
			name: string;
			icon?: string;
			image_url?: string;
			price: number;
		};
		quantity: number;
		unit_price: number;
		total_price: number;
		payment_status: string; // 'pending' | 'paid'
		notes?: string;
		created_at: string;
	}>;
}

export interface ReservationCreate {
	room_id: number;
	check_in: string;
	check_out: string;
	guests: number;
}

export interface AdminReservationCreate extends ReservationCreate {
	user_id: number;
}

export interface AdminReservationUpdate {
	user_id?: number | null;
	room_id?: number | null;
	check_in?: string | null;
	check_out?: string | null;
	guests?: number | null;
	status?: string | null;
}

export interface AdminPaymentCreate {
	reservation_id: number;
	amount: number;
	method: string;
	receipt_type?: string | null;
}

export interface PaymentRead {
	id: number;
	reservation_id: number;
	amount: number;
	method: string;
	status: string;
	receipt_type: string | null;
	receipt_data: any | null;
	created_at: string;
	reservation?: ReservationRead;
}
