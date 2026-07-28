/* ══════════════════════════════════════════════════════
   Ideal Café & Creamery — Payment Backend
   ──────────────────────────────────────────────────────
   Implements the two payment flows cafe-menu.html expects:

     Stripe:  POST /create-payment-intent
     PayPal:  POST /create-paypal-order
              POST /capture-paypal-order

   Both providers require a small server like this one —
   neither can be completed safely from the browser alone,
   since that would mean trusting a price the guest's own
   browser sent you.

   SETUP
   ─────
   1. npm install
   2. Copy .env.example to .env and fill in your real keys
   3. npm start        (defaults to http://localhost:3001,
                         matching the SERVER constant in
                         cafe-menu.html)
   ══════════════════════════════════════════════════════ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TAX_RATE = 0.0875; // keep in sync with TAX_RATE in cafe-menu.html

const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

/* ──────────────────────────────────────────────────────
   MENU PRICES — the server's own source of truth
   ──────────────────────────────────────────────────────
   The browser is never trusted to say what something costs.
   Both payment flows below recompute the total from this
   table using only the item ids and quantities the browser
   sends, so a tampered client can't under-pay.

   IMPORTANT: keep this in sync with MENU_ITEMS in
   cafe-menu.html whenever you edit the menu or prices. For
   a larger deployment, consider moving this into a shared
   menu.json that both the frontend and this server read
   from, so there's only one place to update.
   ────────────────────────────────────────────────────── */
const MENU_PRICES = {
  9: 8.50,   // Mexican Ice Cream
  10: 17.00, // Rasta Pasta with Chicken
  1: 6.50,   // Black Sesame Latte
  2: 7.00,   // Yuzu Cold Brew
  3: 14.00,  // Smoked Salmon Bagel
  4: 15.50,  // Shakshuka Verde
  5: 9.00,   // Burnt Basque Cheesecake
  6: 7.50,   // Matcha Hojicha Split
  7: 18.00,  // Miso Roasted Salmon
  8: 10.00,  // Mochi Trio
};

function computeServerTotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('No items in order');
  }
  // Work entirely in integer cents until the very end — floating point
  // arithmetic on dollar amounts (e.g. 22 * 0.0875) can be off by a cent
  // due to binary floating-point representation, which is exactly the
  // kind of subtle bug you don't want in payment code.
  const subtotalCents = items.reduce((sum, { id, qty }) => {
    const price = MENU_PRICES[id];
    if (price === undefined) throw new Error(`Unknown menu item id: ${id}`);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Invalid quantity for item id: ${id}`);
    return sum + Math.round(price * 100) * qty;
  }, 0);
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + taxCents;
  return {
    subtotal: subtotalCents / 100,
    tax: taxCents / 100,
    total: totalCents / 100,
  };
}

/* ══════════════════════════════════════════
   STRIPE — create a PaymentIntent
   ══════════════════════════════════════════ */
app.post('/create-payment-intent', async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured on this server (missing STRIPE_SECRET_KEY in .env).' });
  }
  try {
    const { items, customerName, orderNum, paymentMethod } = req.body;
    const { total } = computeServerTotal(items); // server decides the price, not the browser
    const amountCents = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      metadata: {
        customerName: customerName || '',
        orderNum: orderNum || '',
        paymentMethod: paymentMethod || '',
      },
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret, amountCents });
  } catch (err) {
    console.error('[Stripe] create-payment-intent failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════
   PAYPAL — OAuth2 + order create/capture
   ══════════════════════════════════════════ */
const PAYPAL_API = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal is not configured on this server (missing PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET in .env).');
  }
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'PayPal authentication failed');
  return data.access_token;
}

app.post('/create-paypal-order', async (req, res) => {
  try {
    const { items, orderNum } = req.body;
    const { total } = computeServerTotal(items); // server decides the price, not the browser

    const accessToken = await getPayPalAccessToken();
    const orderRes = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: orderNum || undefined,
          amount: { currency_code: 'USD', value: total.toFixed(2) },
        }],
      }),
    });
    const order = await orderRes.json();
    if (!orderRes.ok) throw new Error(order.message || 'PayPal order creation failed');
    res.json({ orderID: order.id });
  } catch (err) {
    console.error('[PayPal] create-order failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/capture-paypal-order', async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: 'Missing orderID' });

    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const capture = await captureRes.json();
    if (!captureRes.ok) throw new Error(capture.message || 'PayPal capture failed');

    const captureId = capture.purchase_units
      && capture.purchase_units[0]
      && capture.purchase_units[0].payments
      && capture.purchase_units[0].payments.captures
      && capture.purchase_units[0].payments.captures[0]
      && capture.purchase_units[0].payments.captures[0].id;

    res.json({ status: capture.status, captureId });
  } catch (err) {
    console.error('[PayPal] capture-order failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ══════════════════════════════════════════
   HEALTH CHECK
   ══════════════════════════════════════════ */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    stripeConfigured: !!stripe,
    paypalConfigured: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
  });
});

app.listen(PORT, () => {
  console.log(`Ideal Café payment server running on http://localhost:${PORT}`);
  console.log(`Stripe configured: ${!!stripe}`);
  console.log(`PayPal configured: ${!!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)}`);
});
