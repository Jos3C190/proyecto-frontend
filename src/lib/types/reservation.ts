import type { RoomRead } from './room';

export interface ReservationRead {
	id: number;
	unique_id: string;
	user_id: number;
	room_id: number;
	check_in: string; // date YYYY-MM-DD
	check_out: string;
	guests: number;
	total_cost: number;
	total_paid: number;
	balance: number;
	status: string; // pending, confirmed, cancelled
	created_at: string;
	
	room?: RoomRead;
	user?: {
		id: number;
		email: string;
		profile?: {
			first_name: string;
			last_name: string;
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
