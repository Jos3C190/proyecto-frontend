export interface RoomTypeCreate {
	name: string;
	description?: string;
}

export interface RoomTypeRead {
	id: number;
	name: string;
	description?: string;
}

export interface RoomAmenityRead {
	id: number;
	name: string;
}

export interface RoomImageRead {
	id: number;
	url: string;
}

export interface SeasonPriceCreate {
	start_date: string;
	end_date: string;
	price_multiplier: number;
	description?: string;
}

export interface SeasonPriceRead extends SeasonPriceCreate {
	id: number;
}

export interface RoomRead {
	id: number;
	number: string;
	type: string;
	capacity: number;
	base_price: number;
	description?: string | null;
	is_active: boolean;
	amenities: RoomAmenityRead[];
	images: RoomImageRead[];
	season_prices: SeasonPriceRead[];
}

export interface RoomCreate {
	number: string;
	type: string;
	capacity: number;
	base_price: number;
	description?: string;
	is_active: boolean;
	season_prices: SeasonPriceCreate[];
	images: string[];
}

export interface RoomUpdate extends Partial<RoomCreate> {}

export interface RoomSearchResponse {
	room: RoomRead;
	total_price: number | null;
	is_available: boolean;
}

export interface RoomAuditLog {
    id: number;
    room_id: number;
    user_id: number;
    action: string;
    timestamp: string;
    description: string;
}
