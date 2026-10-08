# Kirana Store - Production Version

This version uses **PostgreSQL** for permanent online storage.

## Render setup

1. Create a PostgreSQL database in Render.
2. Open the PostgreSQL database and copy its **Internal Database URL**.
3. Open the `kirana-store` Web Service in Render.
4. Go to **Environment**.
5. Add:
   - `DATABASE_URL` = your PostgreSQL Internal Database URL
   - `ADMIN_KEY` = your private admin password
6. Build Command: `npm install`
7. Start Command: `npm start`
8. Save and deploy.

The server automatically creates all required tables and starter products on first startup.

## Local testing

Set `DATABASE_URL` and `ADMIN_KEY` in the terminal before running:

PowerShell:

```powershell
$env:DATABASE_URL="YOUR_POSTGRES_URL"
$env:ADMIN_KEY="YOUR_ADMIN_PASSWORD"
npm.cmd install
npm.cmd run dev
```

## Features

- Admin-controlled shop name, logo, welcome text and theme
- Startup animation and order celebration
- Offers / advertisements
- Product ratings and customer feedback
- Product expiry / best-before tracking
- Barcode/SKU support
- USB/Bluetooth keyboard-style barcode scanner support
- Billing / POS and printable bills
- Orders, expenses and profit dashboard
- PostgreSQL persistent storage
- Mobile-friendly customer and admin pages
