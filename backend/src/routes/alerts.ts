import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getDb } from '../db';
import { PriceAlert } from '../types';

const router = Router();
router.use(requireAuth);

const CreateAlertSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  alert_type: z.enum(['price_drop', 'sale']),
  price_threshold: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
}).refine(
  (data) => data.alert_type !== 'price_drop' || data.price_threshold !== undefined,
  { message: 'price_threshold is required for price_drop alerts', path: ['price_threshold'] }
);

const UpdateAlertSchema = z.object({
  is_active: z.boolean().optional(),
  price_threshold: z.number().positive().optional(),
  departure_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/alerts
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const alerts = db
    .prepare('SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.userId) as PriceAlert[];
  // Normalize SQLite booleans
  res.json({ alerts: alerts.map((a) => ({ ...a, is_active: Boolean(a.is_active) })) });
});

// POST /api/alerts
router.post('/', (req: AuthRequest, res: Response) => {
  const parsed = CreateAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const { origin, destination, departure_date, alert_type, price_threshold, currency } = parsed.data;
  const id = uuidv4();

  db.prepare(
    `INSERT INTO price_alerts
       (id, user_id, origin, destination, departure_date, alert_type, price_threshold, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    req.user!.userId,
    origin.toUpperCase(),
    destination.toUpperCase(),
    departure_date ?? null,
    alert_type,
    price_threshold ?? null,
    currency
  );

  const alert = db.prepare('SELECT * FROM price_alerts WHERE id = ?').get(id) as PriceAlert;
  res.status(201).json({ alert: { ...alert, is_active: Boolean(alert.is_active) } });
});

// PATCH /api/alerts/:id
router.patch('/:id', (req: AuthRequest, res: Response) => {
  const parsed = UpdateAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM price_alerts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user!.userId) as PriceAlert | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  const updates = parsed.data;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0); }
  if (updates.price_threshold !== undefined) { fields.push('price_threshold = ?'); values.push(updates.price_threshold); }
  if (updates.departure_date !== undefined) { fields.push('departure_date = ?'); values.push(updates.departure_date); }

  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }

  values.push(req.params.id, req.user!.userId);
  db.prepare(`UPDATE price_alerts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);

  const alert = db.prepare('SELECT * FROM price_alerts WHERE id = ?').get(req.params.id) as PriceAlert;
  res.json({ alert: { ...alert, is_active: Boolean(alert.is_active) } });
});

// DELETE /api/alerts/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM price_alerts WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user!.userId);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
