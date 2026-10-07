# Kirana Store - no Visual Studio version

This version does NOT use `better-sqlite3`, so Visual Studio C++ Build Tools are not required.

## Requirements
- Node.js 22 LTS or newer supported Node version
- npm

## Run on Windows
Open PowerShell in this folder and run:

```powershell
npm.cmd install
npm.cmd run dev
```

Open:

http://localhost:3000

Admin:

http://localhost:3000/admin/

Default admin key:

```text
change-this-admin-key
```

For a custom admin key, use:

```powershell
$env:ADMIN_KEY="your-secret-key"
npm.cmd run dev
```

## Data
The app stores products, orders, order items and expenses in `store-data.json` in the project folder. It is created automatically on first run.
