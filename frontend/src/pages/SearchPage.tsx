import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowLeftRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { flightsApi } from '../services/api';
import { FlightCard } from '../components/FlightCard';
import { Flight } from '../types';
import clsx from 'clsx';

const CABIN_CLASSES = ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'] as const;

type SortKey = 'price' | 'duration' | 'departure';

function parseDuration(d: string): number {
  const match = d.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function sortFlights(flights: Flight[], key: SortKey): Flight[] {
  return [...flights].sort((a, b) => {
    if (key === 'price') return a.price - b.price;
    if (key === 'duration') return parseDuration(a.duration) - parseDuration(b.duration);
    if (key === 'departure') return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime();
    return 0;
  });
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [origin, setOrigin] = useState(searchParams.get('origin') ?? '');
  const [destination, setDestination] = useState(searchParams.get('destination') ?? '');
  const [departureDate, setDepartureDate] = useState(
    searchParams.get('departure_date') ?? new Date().toISOString().split('T')[0]
  );
  const [returnDate, setReturnDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [cabinClass, setCabinClass] = useState<string>('ECONOMY');
  const [sortKey, setSortKey] = useState<SortKey>('price');
  const [searched, setSearched] = useState(false);

  const [queryParams, setQueryParams] = useState<Record<string, string> | null>(null);

  const { data, isFetching, error } = useQuery({
    queryKey: ['flights', queryParams],
    queryFn: () =>
      flightsApi.search({
        origin: queryParams!.origin,
        destination: queryParams!.destination,
        departure_date: queryParams!.departure_date,
        return_date: queryParams!.return_date || undefined,
        adults: parseInt(queryParams!.adults),
        cabin_class: queryParams!.cabin_class,
        currency: 'USD',
      }),
    enabled: !!queryParams,
    staleTime: 5 * 60 * 1000,
  });

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_date: departureDate,
      adults: String(adults),
      cabin_class: cabinClass,
    };
    if (returnDate) params.return_date = returnDate;
    setQueryParams(params);
    setSearched(true);
    navigate(`/?origin=${origin}&destination=${destination}&departure_date=${departureDate}`);
  };

  const flights = data?.data.flights ?? [];
  const sorted = sortFlights(flights, sortKey);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-teal-500 pt-10 pb-24">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Find Your Next Flight
          </h1>
          <p className="text-blue-100 mb-8">Search, compare, and never miss a great deal.</p>

          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            {/* Origin / Destination row */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">From</label>
                <input
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="JFK"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleSwap}
                className="mb-0.5 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                title="Swap origin and destination"
              >
                <ArrowLeftRight size={16} className="text-gray-500" />
              </button>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">To</label>
                <input
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value.toUpperCase())}
                  maxLength={3}
                  placeholder="LAX"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
                />
              </div>
            </div>

            {/* Dates + pax row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Depart</label>
                <input
                  required
                  type="date"
                  value={departureDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Return (opt.)</label>
                <input
                  type="date"
                  value={returnDate}
                  min={departureDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Passengers</label>
                <select
                  value={adults}
                  onChange={(e) => setAdults(parseInt(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Class</label>
                <select
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CABIN_CLASSES.map((c) => (
                    <option key={c} value={c}>{c.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isFetching}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Search size={18} />
              {isFetching ? 'Searching…' : 'Search Flights'}
            </button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        {isFetching && (
          <div className="text-center py-16 text-gray-500">
            <div className="inline-block animate-spin text-4xl mb-4">✈</div>
            <p>Searching for the best deals…</p>
          </div>
        )}

        {!isFetching && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-600">
            Failed to fetch flights. Please try again.
          </div>
        )}

        {!isFetching && searched && !error && (
          <>
            {flights.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
                No flights found for this route. Try different dates.
              </div>
            ) : (
              <>
                {/* Sort bar */}
                <div className="bg-white rounded-xl shadow mb-4 px-5 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    <strong>{flights.length}</strong> flights found
                    {data?.data.source === 'mock' && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Demo data – add Amadeus API keys for live results
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Sort:</span>
                    {(['price', 'duration', 'departure'] as SortKey[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setSortKey(k)}
                        className={clsx(
                          'px-3 py-1 rounded-lg capitalize transition-colors',
                          sortKey === k
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3 pb-10">
                  {sorted.map((f) => <FlightCard key={f.id} flight={f} />)}
                </div>
              </>
            )}
          </>
        )}

        {!searched && !isFetching && (
          <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
            <div className="text-5xl mb-4">✈️</div>
            <p className="text-lg font-medium text-gray-600">Where would you like to go?</p>
            <p className="text-sm mt-1">Enter your route above to see available flights.</p>
          </div>
        )}
      </div>
    </div>
  );
}
