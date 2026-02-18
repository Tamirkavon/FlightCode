import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Trash2, Plus, TrendingDown, Tag, AlertCircle } from 'lucide-react';
import { alertsApi } from '../services/api';
import { PriceAlert, AlertType } from '../types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';

interface CreateAlertForm {
  origin: string;
  destination: string;
  departure_date: string;
  alert_type: AlertType;
  price_threshold: string;
  currency: string;
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'];

function AlertBadge({ type }: { type: AlertType }) {
  if (type === 'price_drop') {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
        <TrendingDown size={11} /> Price drop
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
      <Tag size={11} /> Sale alert
    </span>
  );
}

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAlertForm>({
    origin: '',
    destination: '',
    departure_date: '',
    alert_type: 'price_drop',
    price_threshold: '',
    currency: 'USD',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      alertsApi.create({
        origin: form.origin.toUpperCase(),
        destination: form.destination.toUpperCase(),
        departure_date: form.departure_date || undefined,
        alert_type: form.alert_type,
        price_threshold: form.alert_type === 'price_drop' ? parseFloat(form.price_threshold) : undefined,
        currency: form.currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert created!');
      setShowForm(false);
      setForm({ origin: '', destination: '', departure_date: '', alert_type: 'price_drop', price_threshold: '', currency: 'USD' });
    },
    onError: () => toast.error('Could not create alert'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      alertsApi.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    onError: () => toast.error('Could not update alert'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert deleted');
    },
    onError: () => toast.error('Could not delete alert'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.alert_type === 'price_drop' && !form.price_threshold) {
      toast.error('Enter a price threshold for price drop alerts');
      return;
    }
    createMutation.mutate();
  };

  const alerts: PriceAlert[] = data?.data.alerts ?? [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Price Alerts</h1>
          <p className="text-gray-500 text-sm mt-1">
            We'll email you when prices drop or sales go live.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} /> New Alert
        </button>
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell size={18} className="text-blue-600" /> Create Price Alert
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">From (IATA)</label>
                <input
                  required
                  value={form.origin}
                  onChange={(e) => setForm({ ...form, origin: e.target.value.toUpperCase() })}
                  maxLength={3}
                  placeholder="JFK"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">To (IATA)</label>
                <input
                  required
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value.toUpperCase() })}
                  maxLength={3}
                  placeholder="LHR"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Alert type</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(['price_drop', 'sale'] as AlertType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, alert_type: type })}
                      className={clsx(
                        'flex-1 py-2.5 text-sm font-medium transition-colors',
                        form.alert_type === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      )}
                    >
                      {type === 'price_drop' ? 'Price drop' : 'Sale'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Departure (opt.)</label>
                <input
                  type="date"
                  value={form.departure_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {form.alert_type === 'price_drop' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                    Alert me below price
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={form.price_threshold}
                    onChange={(e) => setForm({ ...form, price_threshold: e.target.value })}
                    placeholder="e.g. 300"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {form.alert_type === 'sale' && (
              <div className="flex items-start gap-2 bg-purple-50 rounded-lg p-3 text-sm text-purple-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>We'll notify you whenever we detect a significant price drop (&gt;20%) on this route.</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Alert'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading alerts…</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <Bell size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium mb-1">No alerts yet</p>
          <p className="text-gray-400 text-sm">Click "New Alert" to get notified about price drops.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={clsx(
                'bg-white rounded-xl border shadow-sm p-5 transition-opacity',
                !alert.is_active && 'opacity-60',
                'border-gray-100'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-lg text-gray-900">
                      {alert.origin} → {alert.destination}
                    </span>
                    <AlertBadge type={alert.alert_type} />
                    {!alert.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Paused</span>
                    )}
                  </div>

                  <div className="text-sm text-gray-500 space-y-0.5">
                    {alert.price_threshold && (
                      <div>Alert below: <strong className="text-gray-800">{alert.currency} {alert.price_threshold}</strong></div>
                    )}
                    {alert.departure_date && (
                      <div>Departure: <strong className="text-gray-800">{alert.departure_date}</strong></div>
                    )}
                    {alert.last_price && (
                      <div>Last seen price: <strong className="text-gray-800">{alert.currency} {alert.last_price.toFixed(0)}</strong></div>
                    )}
                    {alert.last_checked_at && (
                      <div className="text-xs text-gray-400">
                        Last checked: {format(new Date(alert.last_checked_at), 'dd MMM HH:mm')}
                        {alert.triggered_count > 0 && ` · Triggered ${alert.triggered_count}×`}
                      </div>
                    )}
                    <div className="text-xs text-gray-400">Created: {format(new Date(alert.created_at), 'dd MMM yyyy')}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: alert.id, is_active: !alert.is_active })}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      alert.is_active
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                    title={alert.is_active ? 'Pause alert' : 'Resume alert'}
                  >
                    {alert.is_active ? <Bell size={13} /> : <BellOff size={13} />}
                    {alert.is_active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(alert.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete alert"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
