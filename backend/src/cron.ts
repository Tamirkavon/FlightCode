/**
 * Price-watch cron job
 *
 * Run standalone:  npm run cron   (or npx ts-node src/cron.ts)
 * Or import from index.ts to run in-process.
 *
 * Schedule is controlled via PRICE_CHECK_CRON env var (default: every hour).
 */

import 'dotenv/config';
import cron from 'node-cron';
import { getDb } from './db';
import { getLowestPrice } from './services/flightService';
import { sendPriceDropEmail } from './services/emailService';
import { PriceAlert, User } from './types';

const SCHEDULE = process.env.PRICE_CHECK_CRON ?? '0 * * * *';

async function checkAlerts(): Promise<void> {
  console.log(`[cron] Running price check at ${new Date().toISOString()}`);
  const db = getDb();

  const alerts = db
    .prepare(
      `SELECT pa.*, u.email, u.name
       FROM price_alerts pa
       JOIN users u ON u.id = pa.user_id
       WHERE pa.is_active = 1`
    )
    .all() as (PriceAlert & { email: string; name: string })[];

  console.log(`[cron] Checking ${alerts.length} active alert(s)`);

  for (const alert of alerts) {
    try {
      const currentPrice = await getLowestPrice(alert.origin, alert.destination, alert.currency);
      if (currentPrice === null) continue;

      const now = new Date().toISOString();
      const user: User = {
        id: alert.user_id,
        email: alert.email,
        name: alert.name,
        password_hash: '',
        created_at: '',
      };

      let shouldNotify = false;

      if (alert.alert_type === 'price_drop' && alert.price_threshold !== undefined) {
        shouldNotify = currentPrice <= alert.price_threshold;
      } else if (alert.alert_type === 'sale') {
        // Notify if price dropped >20% from last known price
        if (alert.last_price && currentPrice < alert.last_price * 0.8) {
          shouldNotify = true;
        }
      }

      if (shouldNotify) {
        console.log(`[cron] Alert triggered for ${alert.origin}->${alert.destination} @ ${currentPrice}`);
        await sendPriceDropEmail(user, alert, currentPrice);
        db.prepare(
          `UPDATE price_alerts
           SET last_checked_at = ?, last_price = ?, triggered_count = triggered_count + 1
           WHERE id = ?`
        ).run(now, currentPrice, alert.id);
      } else {
        db.prepare(
          'UPDATE price_alerts SET last_checked_at = ?, last_price = ? WHERE id = ?'
        ).run(now, currentPrice, alert.id);
      }
    } catch (err) {
      console.error(`[cron] Error processing alert ${alert.id}:`, err);
    }
  }

  console.log(`[cron] Done.`);
}

// Run once immediately on startup, then on schedule
checkAlerts();
cron.schedule(SCHEDULE, checkAlerts);
console.log(`[cron] Price-watch scheduled: ${SCHEDULE}`);
