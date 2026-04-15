import type { ReservationRead } from './reservation';

export interface PaymentCreate {
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
	receipt_type?: string | null;
	receipt_data?: any | null; // json with company name, date, customer, etc.
	created_at: string;
	
	reservation?: ReservationRead;
}
