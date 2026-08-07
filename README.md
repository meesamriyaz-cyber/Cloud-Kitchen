# Mukhtar Cloud Kitchen — Pure MERN App

A 100% pure MERN (MongoDB, Express, React, Node.js) cloud kitchen ordering app.

## Prerequisites

- Node.js >= 18
- MongoDB (local instance or Atlas connection string)
- npm

## Quick Start

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Configure environment variables:
   - `backend/.env` is already populated with a MongoDB Atlas connection string and defaults.
   - Update `JWT_SECRET`, `RAZORPAY_KEY_ID`, and `RAZORPAY_KEY_SECRET` with real values for production.
   - `frontend/.env` is already set to `http://localhost:8002`.

3. Run the app:
   ```bash
   npm run dev
   ```

   This starts:
   - Backend on http://localhost:8002 (auto-increments to 8003, 8004... if the port is busy)
   - Frontend on http://localhost:3000

4. Seed the database (optional):
   ```bash
   # In a new terminal, while the app is running:
   curl -X POST http://localhost:8002/api/seed
   ```

   Seeded accounts:
   - Admin: `admin@mukhtar.com` / `Admin@123`
   - Salesman/POS: `salesman@mukhtar.com` / `Salesman@123`
   - Customer: `customer@mukhtar.com` / `Customer@123`

## MongoDB Notes

- The backend is configured to use a MongoDB Atlas cluster by default via `MUKHTAR_KITCHEN__MONGO_URI` in `backend/.env`.
- If you prefer local MongoDB, replace the Atlas URI with `mongodb://localhost:27017/mukhtar_kitchen`.
- If MongoDB is unreachable at startup, the backend will retry for ~20 seconds and then stay up, returning `503 Database unavailable` for API routes so the frontend can still load.

## Run from VSCode

1. Open the project in VSCode
2. Press `Ctrl+Shift+B` and select **"Start Mukhtar Kitchen (Dev)"**
3. Or open the **Run and Debug** panel and select **"Debug Fullstack"**

## Project Structure

```
mukhtar-kitchen/
  backend/          # Express + MongoDB API (ES Modules)
    index.js        # Main server file
    package.json    # Backend dependencies
    .env            # Backend environment variables
  frontend/         # React + Tailwind + Shadcn UI
    src/            # Source code
    public/         # Static assets
    package.json    # Frontend dependencies
    .env            # Frontend environment variables
  package.json      # Root scripts (concurrently)
```

## Tech Stack

- **Backend**: Express.js, MongoDB (Mongoose), JWT auth, Razorpay payments
- **Frontend**: React 19, React Router, Tailwind CSS, Shadcn UI, Axios
- **Dev**: Nodemon, Concurrently, CRACO

## Default Ports

- Backend: `8002` (auto-increments if busy)
- Frontend: `3000`
