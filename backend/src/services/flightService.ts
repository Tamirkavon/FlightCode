import { Flight, FlightSearchParams } from '../types';

// ---------------------------------------------------------------------------
// Amadeus API integration (optional – falls back to mock data when no keys)
// ---------------------------------------------------------------------------

let amadeusToken: string | null = null;
let amadeusTokenExpiry = 0;

async function getAmadeusToken(): Promise<string | null> {
  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (amadeusToken && Date.now() < amadeusTokenExpiry) return amadeusToken;

  const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
  amadeusToken = data.access_token;
  amadeusTokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
  return amadeusToken;
}

async function searchAmadeus(params: FlightSearchParams): Promise<Flight[] | null> {
  const token = await getAmadeusToken();
  if (!token) return null;

  const qs = new URLSearchParams({
    originLocationCode: params.origin,
    destinationLocationCode: params.destination,
    departureDate: params.departure_date,
    adults: String(params.adults ?? 1),
    currencyCode: params.currency ?? 'USD',
    max: '20',
  });
  if (params.return_date) qs.set('returnDate', params.return_date);
  if (params.cabin_class) qs.set('travelClass', params.cabin_class.toUpperCase());

  const res = await fetch(
    `https://test.api.amadeus.com/v2/shopping/flight-offers?${qs}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { data: AmadeusOffer[] };
  return data.data.map(parseAmadeusOffer);
}

interface AmadeusOffer {
  id: string;
  itineraries: Array<{
    duration: string;
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      numberOfStops: number;
    }>;
  }>;
  price: { total: string; currency: string };
  travelerPricings: Array<{
    fareDetailsBySegment: Array<{ cabin: string }>;
    price: { total: string };
  }>;
  numberOfBookableSeats: number;
  validatingAirlineCodes: string[];
}

function parseAmadeusOffer(offer: AmadeusOffer): Flight {
  const itinerary = offer.itineraries[0];
  const first = itinerary.segments[0];
  const last = itinerary.segments[itinerary.segments.length - 1];
  const cabin =
    offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin ?? 'ECONOMY';

  return {
    id: offer.id,
    origin: first.departure.iataCode,
    destination: last.arrival.iataCode,
    departure_time: first.departure.at,
    arrival_time: last.arrival.at,
    duration: itinerary.duration.replace('PT', '').toLowerCase(),
    airline: offer.validatingAirlineCodes[0] ?? first.carrierCode,
    airline_code: first.carrierCode,
    flight_number: `${first.carrierCode}${first.number}`,
    price: parseFloat(offer.price.total),
    currency: offer.price.currency,
    seats_available: offer.numberOfBookableSeats,
    cabin_class: cabin,
    stops: itinerary.segments.length - 1,
  };
}

// ---------------------------------------------------------------------------
// Mock data generator (used when Amadeus keys are not configured)
// ---------------------------------------------------------------------------

const AIRLINES = [
  { name: 'American Airlines', code: 'AA' },
  { name: 'Delta Air Lines', code: 'DL' },
  { name: 'United Airlines', code: 'UA' },
  { name: 'Southwest Airlines', code: 'WN' },
  { name: 'British Airways', code: 'BA' },
  { name: 'Lufthansa', code: 'LH' },
  { name: 'Air France', code: 'AF' },
  { name: 'Emirates', code: 'EK' },
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function generateMockFlights(params: FlightSearchParams): Flight[] {
  const base = new Date(`${params.departure_date}T06:00:00`);
  const currency = params.currency ?? 'USD';
  const results: Flight[] = [];

  const count = randomBetween(4, 10);
  for (let i = 0; i < count; i++) {
    const airline = AIRLINES[randomBetween(0, AIRLINES.length - 1)];
    const stops = randomBetween(0, 1);
    const durationMin = randomBetween(60 + stops * 60, 600 + stops * 120);
    const departureOffset = randomBetween(0, 14) * 3600000;
    const departure = new Date(base.getTime() + departureOffset);
    const arrival = addHours(departure, durationMin / 60);
    const price = randomBetween(80, 1800);
    const flightNum = randomBetween(100, 9999);

    results.push({
      id: `mock-${i}-${Date.now()}`,
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      departure_time: departure.toISOString(),
      arrival_time: arrival.toISOString(),
      duration: formatDuration(durationMin),
      airline: airline.name,
      airline_code: airline.code,
      flight_number: `${airline.code}${flightNum}`,
      price,
      currency,
      seats_available: randomBetween(1, 50),
      cabin_class: params.cabin_class ?? 'ECONOMY',
      stops,
    });
  }

  return results.sort((a, b) => a.price - b.price);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchFlights(params: FlightSearchParams): Promise<Flight[]> {
  try {
    const live = await searchAmadeus(params);
    if (live) return live;
  } catch {
    // fall through to mock
  }
  return generateMockFlights(params);
}

export async function getLowestPrice(
  origin: string,
  destination: string,
  currency = 'USD'
): Promise<number | null> {
  const today = new Date();
  const departure_date = today.toISOString().split('T')[0];
  const results = await searchFlights({ origin, destination, departure_date, currency });
  if (!results.length) return null;
  return Math.min(...results.map((f) => f.price));
}
