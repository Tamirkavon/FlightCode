import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { getDb } from '../db';
import { FavoriteRoute } from '../types';

const router = Router();
router.use(requireAuth);

const AddFavoriteSchema = z.object({
  origin: z.string().length(3),
  origin_name: z.string().min(1).max(100),
  destination: z.string().length(3),
  destination_name: z.string().min(1).max(100),
});

// GET /api/favorites
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const favorites = db
    .prepare('SELECT * FROM favorite_routes WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user!.userId) as FavoriteRoute[];
  res.json({ favorites });
});

// POST /api/favorites
router.post('/', (req: AuthRequest, res: Response) => {
  const parsed = AddFavoriteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const db = getDb();
  const { origin, origin_name, destination, destination_name } = parsed.data;
  const id = uuidv4();

  try {
    db.prepare(
      `INSERT INTO favorite_routes (id, user_id, origin, origin_name, destination, destination_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, req.user!.userId, origin.toUpperCase(), origin_name, destination.toUpperCase(), destination_name);

    const fav = db.prepare('SELECT * FROM favorite_routes WHERE id = ?').get(id) as FavoriteRoute;
    res.status(201).json({ favorite: fav });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).message?.includes('UNIQUE')) {
      res.status(409).json({ error: 'Route already saved' });
    } else {
      throw err;
    }
  }
});

// DELETE /api/favorites/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM favorite_routes WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user!.userId);

  if (result.changes === 0) {
    res.status(404).json({ error: 'Favourite not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
