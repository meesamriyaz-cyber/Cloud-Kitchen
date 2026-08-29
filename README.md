# Cloud Kitchen — Pure MERN App

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

## MongoDB Notes

- The backend is configured to use a MongoDB Atlas cluster by default via `MUKHTAR_KITCHEN__MONGO_URI` in `backend/.env`.
- If you prefer local MongoDB, replace the Atlas URI with `mongodb://localhost:27017/mukhtar_kitchen`.
- If MongoDB is unreachable at startup, the backend will retry for ~20 seconds and then stay up, returning `503 Database unavailable` for API routes so the frontend can still load.

## Run from VSCode

1. Open the project in VSCode
2. Press `Ctrl+Shift+B` and select **"Start Cloud Kitchen (Dev)"**
3. Or open the **Run and Debug** panel and select **"Debug Fullstack"**

## Project Structure

```
cloud-kitchen/
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

## POS Payments

The POS now supports 3 payment modes:

| Mode | Flow |
|------|------|
| Cash | Enter amount received, system calculates change, confirm payment |
| UPI | Generate UPI deep link or scan QR, open UPI app, confirm payment |
| Card | Generate Razorpay payment link, customer pays via card/UPI, webhook auto-confirms |

**UPI Deep Link:**
- Uses `upi://pay` intent to open Google Pay, PhonePe, Paytm, etc.
- Configure your UPI ID in `backend/.env` or override via API

**Card / Online:**
- Uses Razorpay Payment Links (web checkout)
- Configure `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `backend/.env`
- Optional: Set `RAZORPAY_WEBHOOK_SECRET` for auto-confirmation via webhooks

**Webhook endpoint:** `POST /api/webhooks/razorpay` — set this URL in Razorpay dashboard to auto-mark orders as paid when payment is captured.

## Image Uploads (Production-Grade with Cloudinary)

Dish images are stored on **Cloudinary CDN** for production performance.

### Setup

1. Create a free Cloudinary account at https://cloudinary.com
2. Get your credentials from the Cloudinary dashboard:
   - Cloud Name
   - API Key
   - API Secret
3. Add to `backend/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### Features

- **Automatic optimization**: Images are resized to 800x600, compressed, and converted to modern formats (WebP/AVIF)
- **CDN delivery**: Images served from Cloudinary's global CDN
- **Fallback support**: Admin can still paste direct image URLs if needed
- **5MB limit**: Max file size per upload

### Admin Menu

- Click **Upload Image** to select from local system
- Preview appears instantly
- Paste alternative URL in the text field if needed

## Default Ports

- Backend: `8002` (auto-increments if busy)
- Frontend: `3000`
