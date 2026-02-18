import nodemailer from 'nodemailer';
import { PriceAlert, User } from '../types';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = process.env.EMAIL_FROM ?? 'FlyAI <noreply@flyai.app>';

function alertTypeLabel(alert: PriceAlert): string {
  return alert.alert_type === 'price_drop' ? 'Price Drop' : 'Sale Detected';
}

export async function sendPriceDropEmail(
  user: User,
  alert: PriceAlert,
  currentPrice: number
): Promise<void> {
  const transport = createTransport();
  const subject = `✈ FlyAI Alert: ${alertTypeLabel(alert)} – ${alert.origin} → ${alert.destination}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #1a56db, #0e9f6e); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,.85); margin: 8px 0 0; }
    .body { padding: 32px; }
    .route { font-size: 24px; font-weight: 700; color: #111; margin-bottom: 20px; }
    .price-box { background: #f0fdf4; border: 2px solid #0e9f6e; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px; }
    .price-box .label { color: #065f46; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
    .price-box .price { font-size: 48px; font-weight: 800; color: #065f46; margin: 8px 0 0; }
    .details { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .details p { margin: 4px 0; color: #555; font-size: 14px; }
    .cta { text-align: center; }
    .cta a { display: inline-block; background: #1a56db; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✈ FlyAI</h1>
      <p>${alertTypeLabel(alert)} Alert</p>
    </div>
    <div class="body">
      <p>Hi ${user.name},</p>
      <p>Great news! We found a deal matching your alert:</p>
      <div class="route">${alert.origin} → ${alert.destination}</div>
      <div class="price-box">
        <div class="label">Current Price From</div>
        <div class="price">${alert.currency} ${currentPrice.toFixed(2)}</div>
      </div>
      <div class="details">
        ${alert.price_threshold ? `<p><strong>Your threshold:</strong> ${alert.currency} ${alert.price_threshold.toFixed(2)}</p>` : ''}
        ${alert.departure_date ? `<p><strong>Departure date:</strong> ${alert.departure_date}</p>` : ''}
        <p><strong>Alert type:</strong> ${alertTypeLabel(alert)}</p>
      </div>
      <div class="cta">
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/search?origin=${alert.origin}&destination=${alert.destination}">
          Search Flights Now
        </a>
      </div>
    </div>
    <div class="footer">
      <p>You received this because you set up a price alert on FlyAI.</p>
      <p>To manage your alerts, visit your <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/notifications">notification settings</a>.</p>
    </div>
  </div>
</body>
</html>`;

  await transport.sendMail({ from: FROM, to: user.email, subject, html });
}

export async function sendWelcomeEmail(user: User): Promise<void> {
  const transport = createTransport();
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #1a56db, #0e9f6e); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; }
    .body { padding: 32px; }
    .feature { display: flex; margin-bottom: 16px; }
    .feature-icon { font-size: 24px; margin-right: 12px; }
    .cta { text-align: center; margin: 32px 0; }
    .cta a { display: inline-block; background: #1a56db; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✈ Welcome to FlyAI</h1>
    </div>
    <div class="body">
      <p>Hi ${user.name}, welcome aboard!</p>
      <p>FlyAI helps you find the best flight deals and never miss a price drop.</p>
      <div class="feature"><span class="feature-icon">🔍</span><div><strong>Search Flights</strong><br>Find flights across hundreds of airlines instantly.</div></div>
      <div class="feature"><span class="feature-icon">❤️</span><div><strong>Save Favourite Routes</strong><br>Bookmark your go-to routes for quick access.</div></div>
      <div class="feature"><span class="feature-icon">🔔</span><div><strong>Price Alerts</strong><br>Get notified when prices drop or sales go live.</div></div>
      <div class="cta">
        <a href="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}">Start Searching</a>
      </div>
    </div>
    <div class="footer">FlyAI – Smart flight searching</div>
  </div>
</body>
</html>`;

  await transport.sendMail({
    from: FROM,
    to: user.email,
    subject: '✈ Welcome to FlyAI – Your flight deal companion',
    html,
  });
}
