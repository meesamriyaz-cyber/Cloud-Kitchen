# Mukhtar Cloud Kitchen — PRD

## Original Problem Statement
User has existing MERN medical shop app and wants to convert it into a cloud kitchen app.

## Stack
- Backend: FastAPI + MongoDB (motor)
- Frontend: React 19 + Tailwind + Shadcn UI + sonner
- Auth: JWT (email/password) + Emergent Google OAuth
- Payments: Razorpay (test keys configured)

## Core Requirements
- Landing page (hero, categories, featured)
- Menu browsing with category filters & search
- Cart drawer + Checkout with COD or Razorpay
- Order tracking with status stepper (placed → preparing → out_for_delivery → delivered)
- My Orders history
- Customer login/signup (email/password + Google)
- Admin dashboard: stats, menu CRUD, order management with status updates

## User Personas
- Customer: browses menu, orders, tracks
- Admin: manages dishes/categories, updates order statuses (login: admin@mukhtar.com / Admin@123)

## What's implemented (2026-02)
- Full backend: auth, categories, dishes, orders, razorpay verify, admin stats, seed
- Full frontend: Home, Menu, Cart, Checkout, Order tracking, My Orders, Login, Signup
- Admin: Dashboard, Menu CRUD, Orders management
- Design system: Terracotta accent, Outfit/Manrope fonts, warm off-white background

## Backlog (P1/P2)
- Category CRUD UI in admin
- Dish detail modal with spice-level selector
- Address book (multiple saved addresses)
- Order cancellation by customer
- Real-time updates via websockets
- Coupons / promo codes
- SMS/email order confirmation via SendGrid/Twilio
