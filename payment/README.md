# Ideal Café — Payment Backend

A small Node/Express server that backs the Stripe and PayPal payment flows
in `cafe-menu.html`. Neither payment provider can be completed safely from
the browser alone — this server exists to keep secret keys off the client
and to make sure the *server*, not the guest's browser, decides what an
order actually costs.

## What this does

| Endpoint                  | Used for                                              |
|----------------------------|--------------------------------------------------------|
| `POST /create-payment-intent` | Stripe — creates a PaymentIntent for card/Apple Pay/Google Pay |
| `POST /create-paypal-order`   | PayPal — creates an order (server recalculates the price) |
| `POST /capture-paypal-order`  | PayPal — captures payment after the guest approves      |
| `GET /health`                 | Quick check of what's configured                        |

**Price safety:** both the Stripe amount and the PayPal order total are
computed server-side from a `MENU_PRICES` table using only the item ids
and quantities the browser sends — never a dollar amount the browser
supplies directly. Keep `MENU_PRICES` in this file in sync with
`MENU_ITEMS` in `cafe-menu.html` whenever you edit the menu.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your real keys:

- **Stripe** — get a secret key from https://dashboard.stripe.com/apikeys
  (use a `sk_test_...` key while testing, switch to `sk_live_...` when ready)
- **PayPal** — create an app at https://developer.paypal.com to get a
  Client ID and Secret (use your Sandbox app's credentials while testing)

Then run it:

```bash
npm start
```

It listens on `http://localhost:3001` by default — this matches the
`SERVER` constant already set in `cafe-menu.html`. If you deploy this
somewhere other than localhost, update that constant to match.

## Turning payments on in the app

This server being available doesn't turn payments on by itself —
`cafe-menu.html` still respects the staff-controlled toggle in
`kitchen.html` (Tables panel → Payment Options). With the toggle off,
guests only see **Pay at the Counter**, same as always.

For the **PayPal button specifically** to render as PayPal's real,
working Checkout button (instead of the styled placeholder), you also
need to set a real `PAYPAL_CLIENT_ID` in `cafe-menu.html` itself (search
for `PAYPAL_CLIENT_ID` near the Stripe setup section). The Client ID is
safe to put directly in the client-side file — it's not a secret, unlike
the Client Secret, which only ever belongs in this server's `.env`.

## Testing without spending real money

- Stripe: use their [test card numbers](https://docs.stripe.com/testing) (e.g. `4242 4242 4242 4242`)
- PayPal: use Sandbox buyer/seller test accounts, generated automatically
  in your PayPal Developer Dashboard, with `PAYPAL_ENV=sandbox` in `.env`

## Deploying

This is a plain Node/Express app — deploy it anywhere that runs Node
(a small VPS, Render, Railway, Fly.io, etc.). Whatever you choose:

- Set the same environment variables from `.env` in that platform's
  environment/secrets settings
- Make sure it's reachable over HTTPS in production (required by both
  Stripe and PayPal, and by browsers for payment APIs generally)
- Update the `SERVER` constant in `cafe-menu.html` to point at wherever
  this ends up running

https://claude.ai/share/46dc0a7f-7f78-4ddc-aebf-31b57ddedd1a
