import { format } from 'date-fns';
import { Plane, Clock, Users, Heart, Bell } from 'lucide-react';
import { Flight } from '../types';
import { useAuth } from '../hooks/useAuth';
import { favoritesApi, alertsApi } from '../services/api';
import toast from 'react-hot-toast';

interface Props {
  flight: Flight;
}

function formatTime(iso: string) {
  return format(new Date(iso), 'HH:mm');
}

function formatDate(iso: string) {
  return format(new Date(iso), 'dd MMM');
}

export function FlightCard({ flight }: Props) {
  const { isAuthenticated } = useAuth();

  const handleSaveFavorite = async () => {
    if (!isAuthenticated) { toast.error('Sign in to save favourite routes'); return; }
    try {
      await favoritesApi.add({
        origin: flight.origin,
        origin_name: flight.origin,
        destination: flight.destination,
        destination_name: flight.destination,
      });
      toast.success('Route saved to favourites!');
    } catch {
      toast.error('Could not save route – it may already be saved');
    }
  };

  const handleSetAlert = async () => {
    if (!isAuthenticated) { toast.error('Sign in to set price alerts'); return; }
    try {
      await alertsApi.create({
        origin: flight.origin,
        destination: flight.destination,
        alert_type: 'price_drop',
        price_threshold: flight.price * 0.9, // alert at 10% below current
        currency: flight.currency,
      });
      toast.success(`Alert set! We'll email you if price drops below ${flight.currency} ${(flight.price * 0.9).toFixed(0)}`);
    } catch {
      toast.error('Could not create alert');
    }
  };

  const stopsLabel = flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5">
      <div className="flex items-center justify-between gap-4">
        {/* Airline */}
        <div className="w-28 shrink-0">
          <div className="text-xs text-gray-400 mb-0.5">{flight.flight_number}</div>
          <div className="font-semibold text-gray-800 text-sm leading-tight">{flight.airline}</div>
          <div className="text-xs text-gray-400 mt-1 capitalize">{flight.cabin_class.replace('_', ' ')}</div>
        </div>

        {/* Route */}
        <div className="flex-1 flex items-center gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatTime(flight.departure_time)}</div>
            <div className="text-xs text-gray-500">{formatDate(flight.departure_time)}</div>
            <div className="text-sm font-semibold text-blue-600">{flight.origin}</div>
          </div>

          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {flight.duration}
            </div>
            <div className="relative w-full flex items-center">
              <div className="h-px bg-gray-300 flex-1" />
              <Plane size={14} className="text-blue-500 rotate-90 mx-1" />
              <div className="h-px bg-gray-300 flex-1" />
            </div>
            <div className="text-xs text-gray-400">{stopsLabel}</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{formatTime(flight.arrival_time)}</div>
            <div className="text-xs text-gray-500">{formatDate(flight.arrival_time)}</div>
            <div className="text-sm font-semibold text-blue-600">{flight.destination}</div>
          </div>
        </div>

        {/* Price + actions */}
        <div className="text-right shrink-0">
          <div className="text-2xl font-extrabold text-gray-900">
            {flight.currency} {flight.price.toFixed(0)}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 justify-end mt-0.5">
            <Users size={11} />
            {flight.seats_available} left
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSaveFavorite}
              title="Save route as favourite"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-pink-200 text-pink-600 hover:bg-pink-50 transition-colors"
            >
              <Heart size={13} /> Save
            </button>
            <button
              onClick={handleSetAlert}
              title="Set price alert"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Bell size={13} /> Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
