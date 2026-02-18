import axios from 'axios';
import { Flight, FavoriteRoute, PriceAlert, FlightSearchParams, User } from '../types';

const api = axios.create({ baseURL: '/api' });

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flyai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: User }>('/auth/login', data),
  me: () => api.get<{ user: User }>('/auth/me'),
};

// Flights
export const flightsApi = {
  search: (params: FlightSearchParams) =>
    api.get<{ flights: Flight[]; source: string }>('/flights/search', { params }),
};

// Favourites
export const favoritesApi = {
  list: () => api.get<{ favorites: FavoriteRoute[] }>('/favorites'),
  add: (data: {
    origin: string;
    origin_name: string;
    destination: string;
    destination_name: string;
  }) => api.post<{ favorite: FavoriteRoute }>('/favorites', data),
  remove: (id: string) => api.delete(`/favorites/${id}`),
};

// Price Alerts
export const alertsApi = {
  list: () => api.get<{ alerts: PriceAlert[] }>('/alerts'),
  create: (data: {
    origin: string;
    destination: string;
    departure_date?: string;
    alert_type: 'price_drop' | 'sale';
    price_threshold?: number;
    currency?: string;
  }) => api.post<{ alert: PriceAlert }>('/alerts', data),
  update: (id: string, data: { is_active?: boolean; price_threshold?: number }) =>
    api.patch<{ alert: PriceAlert }>(`/alerts/${id}`, data),
  remove: (id: string) => api.delete(`/alerts/${id}`),
};
