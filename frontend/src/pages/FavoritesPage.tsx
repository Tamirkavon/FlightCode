import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plane, Trash2, ArrowRight, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { favoritesApi } from '../services/api';
import { FavoriteRoute } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export function FavoritesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => favoritesApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => favoritesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success('Removed from favourites');
    },
    onError: () => toast.error('Could not remove favourite'),
  });

  const favorites: FavoriteRoute[] = data?.data.favorites ?? [];

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400">
        Loading favourites…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Favourite Routes</h1>
          <p className="text-gray-500 text-sm mt-1">Your saved routes for quick access.</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Plane size={40} className="mx-auto text-gray-300 mb-4 rotate-45" />
          <p className="text-gray-600 font-medium mb-1">No favourite routes yet</p>
          <p className="text-gray-400 text-sm mb-6">
            Search for flights and click <strong>Save</strong> to bookmark a route.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Search size={16} /> Search Flights
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Plane size={18} className="text-blue-600 rotate-45" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                    <span>{fav.origin}</span>
                    <ArrowRight size={16} className="text-gray-400" />
                    <span>{fav.destination}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {fav.origin_name} → {fav.destination_name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Saved {format(new Date(fav.created_at), 'dd MMM yyyy')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/?origin=${fav.origin}&destination=${fav.destination}&departure_date=${new Date().toISOString().split('T')[0]}`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors font-medium"
                >
                  <Search size={14} /> Search
                </button>
                <button
                  onClick={() => removeMutation.mutate(fav.id)}
                  disabled={removeMutation.isPending}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove favourite"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
