import { Router, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { searchFlights } from '../services/flightService';

const router = Router();

const SearchSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.coerce.number().int().min(1).max(9).optional(),
  cabin_class: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).optional(),
  currency: z.string().length(3).optional(),
});

// Public search – returns flight offers
router.get('/search', async (req: AuthRequest, res: Response) => {
  const parsed = SearchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const flights = await searchFlights(parsed.data);
  res.json({ flights, source: process.env.AMADEUS_CLIENT_ID ? 'amadeus' : 'mock' });
});

// Authenticated search (same but records user activity in future)
router.get('/search/authenticated', requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = SearchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const flights = await searchFlights(parsed.data);
  res.json({ flights, source: process.env.AMADEUS_CLIENT_ID ? 'amadeus' : 'mock' });
});

export default router;
