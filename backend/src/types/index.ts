export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
}

export interface FavoriteRoute {
  id: string;
  user_id: string;
  origin: string;
  origin_name: string;
  destination: string;
  destination_name: string;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  origin: string;
  destination: string;
  departure_date?: string;
  alert_type: 'price_drop' | 'sale';
  price_threshold?: number;
  currency: string;
  is_active: boolean;
  last_checked_at?: string;
  last_price?: number;
  triggered_count: number;
  created_at: string;
}

export interface Flight {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  airline: string;
  airline_code: string;
  flight_number: string;
  price: number;
  currency: string;
  seats_available: number;
  cabin_class: string;
  stops: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  adults?: number;
  cabin_class?: string;
  currency?: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}
