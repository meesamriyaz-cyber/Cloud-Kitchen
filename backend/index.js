// Mukhtar Cloud Kitchen — MERN backend (Express + MongoDB via Mongoose)
require('dotenv').config();
require('express-async-errors');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const Razorpay = require('razorpay');
const { randomUUID } = require('crypto');

const PORT = parseInt(process.env.PORT || '8002', 10);
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

// ---------- DB ----------
mongoose.connect(MONGO_URL, { dbName: DB_NAME }).then(() => {
  console.log('[mongo] connected', DB_NAME);
}).catch(err => {
  console.error('[mongo] connect error', err);
  process.exit(1);
});

const uid = (prefix) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

// ---------- Schemas ----------
const UserSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, index: true, default: () => uid('user') },
  name: String,
  email: { type: String, lowercase: true, unique: true, index: true },
  password: String,             // bcrypt hash (local users)
  role: { type: String, default: 'customer' }, // customer | admin | staff
  picture: String,
  provider: { type: String, default: 'local' },
  phone: String,
}, { timestamps: true, versionKey: false });

const SessionSchema = new mongoose.Schema({
  user_id: { type: String, index: true },
  session_token: { type: String, unique: true, index: true },
  expires_at: Date,
}, { timestamps: true, versionKey: false });

const CategorySchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true, default: () => uid('cat') },
  name: String,
  image_url: String,
  sort: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

const DishSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true, default: () => uid('dish') },
  name: String,
  description: String,
  price: Number,
  category_id: String,
  image_url: String,
  veg: { type: Boolean, default: true },
  spice_level: { type: String, default: 'medium' },
  is_available: { type: Boolean, default: true },
}, { timestamps: true, versionKey: false });

const CouponSchema = new mongoose.Schema({
  code: { type: String, unique: true, uppercase: true, trim: true },
  discount_type: { type: String, default: 'percent' }, // percent | flat
  value: Number,
  min_order: { type: Number, default: 0 },
  max_discount: { type: Number, default: 0 }, // 0 = unlimited
  active: { type: Boolean, default: true },
  redemptions: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false });

const OrderItemSchema = new mongoose.Schema({
  dish_id: String, name: String, price: Number, qty: Number, image_url: String,
}, { _id: false });

const AddressSchema = new mongoose.Schema({
  full_name: String, phone: String, line1: String, city: String, pincode: String, notes: String,
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  id: { type: String, unique: true, index: true, default: () => uid('ord') },
  user_id: { type: String, index: true },
  items: [OrderItemSchema],
  address: AddressSchema,
  channel: { type: String, default: 'web', enum: ['web', 'pos', 'android'] },
  // POS extras
  pos_customer_name: String,
  pos_customer_phone: String,
  order_type: { type: String, default: 'delivery' }, // delivery | takeaway | dine_in
  table_no: String,
  subtotal: Number,
  discount: { type: Number, default: 0 },
  coupon_code: String,
  delivery_fee: { type: Number, default: 0 },
  tax: Number,
  total: Number,
  payment_method: String, // cod | razorpay | cash | upi
  payment_status: { type: String, default: 'pending' },
  status: { type: String, default: 'placed' },
  razorpay_order_id: String,
  razorpay_payment_id: String,
  order_no: Number,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false });

const CounterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
}, { versionKey: false });

const User = mongoose.model('User', UserSchema);
const Session = mongoose.model('Session', SessionSchema, 'user_sessions');
const Category = mongoose.model('Category', CategorySchema);
const Dish = mongoose.model('Dish', DishSchema);
const Coupon = mongoose.model('Coupon', CouponSchema);
const Order = mongoose.model('Order', OrderSchema);
const Counter = mongoose.model('Counter', CounterSchema);

async function nextOrderNo() {
  const c = await Counter.findByIdAndUpdate('order_no', { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}

// ---------- App ----------
const app = express();
app.use(cors({ origin: (process.env.CORS_ORIGINS || '*').split(','), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`); next(); });

// ---------- Auth helpers ----------
function signJwt(user_id) {
  return jwt.sign({ user_id }, JWT_SECRET, { expiresIn: '7d' });
}

async function resolveUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const u = await User.findOne({ user_id: payload.user_id }).lean();
      if (u) return u;
    } catch { /* try session */ }
    const sess = await Session.findOne({ session_token: token }).lean();
    if (sess && new Date(sess.expires_at) > new Date()) {
      const u = await User.findOne({ user_id: sess.user_id }).lean();
      if (u) return u;
    }
  }
  const cookieTok = req.cookies?.session_token;
  if (cookieTok) {
    const sess = await Session.findOne({ session_token: cookieTok }).lean();
    if (sess && new Date(sess.expires_at) > new Date()) {
      const u = await User.findOne({ user_id: sess.user_id }).lean();
      if (u) return u;
    }
  }
  return null;
}

function authRequired(req, res, next) {
  resolveUser(req).then(u => {
    if (!u) return res.status(401).json({ detail: 'Not authenticated' });
    req.user = u; next();
  }).catch(next);
}

function adminOnly(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') return res.status(403).json({ detail: 'Admin only' });
    next();
  });
}

function adminStrict(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
    next();
  });
}

function publicUser(u) {
  return { user_id: u.user_id, name: u.name, email: u.email, role: u.role || 'customer', picture: u.picture || null };
}

// ---------- Health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, stack: 'MERN' }));

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ detail: 'Missing fields' });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ detail: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const u = await User.create({ name, email: email.toLowerCase(), password: hash, role: 'customer', provider: 'local' });
  res.json({ token: signJwt(u.user_id), user: publicUser(u) });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const u = await User.findOne({ email: (email || '').toLowerCase() });
  if (!u || !u.password || !(await bcrypt.compare(password, u.password))) {
    return res.status(401).json({ detail: 'Invalid credentials' });
  }
  res.json({ token: signJwt(u.user_id), user: publicUser(u) });
});

app.post('/api/auth/session', async (req, res) => {
  const { session_id } = req.body || {};
  if (!session_id) return res.status(400).json({ detail: 'Missing session_id' });
  let data;
  try {
    const r = await axios.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
      { headers: { 'X-Session-ID': session_id }, timeout: 15000 });
    data = r.data;
  } catch { return res.status(401).json({ detail: 'Invalid session' }); }

  const email = String(data.email).toLowerCase();
  let u = await User.findOne({ email });
  if (!u) {
    u = await User.create({ name: data.name, email, picture: data.picture, provider: 'google', role: 'customer' });
  } else {
    u.name = data.name; u.picture = data.picture; await u.save();
  }
  const session_token = data.session_token;
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Session.create({ user_id: u.user_id, session_token, expires_at });
  res.cookie('session_token', session_token, { httpOnly: true, secure: true, sameSite: 'none', path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: publicUser(u), token: session_token });
});

app.get('/api/auth/me', authRequired, (req, res) => res.json(publicUser(req.user)));

app.post('/api/auth/logout', async (req, res) => {
  const tok = req.cookies?.session_token;
  if (tok) await Session.deleteOne({ session_token: tok });
  res.clearCookie('session_token', { path: '/' });
  res.json({ ok: true });
});

// ---------- Categories ----------
app.get('/api/categories', async (_req, res) => {
  const cats = await Category.find({}).sort({ sort: 1, name: 1 }).lean();
  res.json(cats.map(c => ({ id: c.id, name: c.name, image_url: c.image_url, sort: c.sort })));
});
app.post('/api/categories', adminOnly, async (req, res) => {
  const c = await Category.create({ ...req.body });
  res.json({ id: c.id, name: c.name, image_url: c.image_url });
});
app.put('/api/categories/:id', adminOnly, async (req, res) => {
  const r = await Category.updateOne({ id: req.params.id }, { $set: req.body });
  if (!r.matchedCount) return res.status(404).json({ detail: 'Not found' });
  res.json({ ok: true });
});
app.delete('/api/categories/:id', adminOnly, async (req, res) => {
  await Category.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// ---------- Dishes ----------
app.get('/api/dishes', async (req, res) => {
  const q = {};
  if (req.query.category_id) q.category_id = req.query.category_id;
  if (req.query.q) q.name = { $regex: req.query.q, $options: 'i' };
  const dishes = await Dish.find(q).sort({ name: 1 }).lean();
  res.json(dishes.map(d => ({ id: d.id, name: d.name, description: d.description, price: d.price,
    category_id: d.category_id, image_url: d.image_url, veg: d.veg, spice_level: d.spice_level, is_available: d.is_available })));
});
app.get('/api/dishes/:id', async (req, res) => {
  const d = await Dish.findOne({ id: req.params.id }).lean();
  if (!d) return res.status(404).json({ detail: 'Not found' });
  res.json(d);
});
app.post('/api/dishes', adminOnly, async (req, res) => {
  const d = await Dish.create({ ...req.body });
  res.json(d.toObject());
});
app.put('/api/dishes/:id', adminOnly, async (req, res) => {
  const r = await Dish.updateOne({ id: req.params.id }, { $set: req.body });
  if (!r.matchedCount) return res.status(404).json({ detail: 'Not found' });
  res.json({ ok: true });
});
app.delete('/api/dishes/:id', adminOnly, async (req, res) => {
  await Dish.deleteOne({ id: req.params.id });
  res.json({ ok: true });
});

// ---------- Coupons ----------
app.get('/api/coupons', adminOnly, async (_req, res) => {
  const list = await Coupon.find({}).lean();
  res.json(list);
});
app.post('/api/coupons', adminOnly, async (req, res) => {
  const c = await Coupon.create({ ...req.body });
  res.json(c.toObject());
});
app.delete('/api/coupons/:code', adminOnly, async (req, res) => {
  await Coupon.deleteOne({ code: req.params.code.toUpperCase() });
  res.json({ ok: true });
});
app.post('/api/coupons/apply', async (req, res) => {
  const { code, subtotal } = req.body || {};
  const c = await Coupon.findOne({ code: (code || '').toUpperCase(), active: true });
  if (!c) return res.status(404).json({ detail: 'Invalid or inactive coupon' });
  if (subtotal < (c.min_order || 0)) return res.status(400).json({ detail: `Minimum order ₹${c.min_order}` });
  let discount = c.discount_type === 'percent' ? subtotal * (c.value / 100) : c.value;
  if (c.max_discount && discount > c.max_discount) discount = c.max_discount;
  discount = Math.round(discount * 100) / 100;
  res.json({ code: c.code, discount, discount_type: c.discount_type, value: c.value });
});

// ---------- Payments (Razorpay) ----------
app.get('/api/payments/razorpay/config', (_req, res) => res.json({ key_id: RAZORPAY_KEY_ID }));
app.post('/api/payments/razorpay/order', authRequired, async (req, res) => {
  const amount = Math.round((req.body.amount || 0) * 100);
  const order = await rzp.orders.create({ amount, currency: 'INR', payment_capture: 1, receipt: `rcpt_${uid('r')}`.slice(0, 40) });
  res.json(order);
});
function verifyRzpSignature(order_id, payment_id, signature) {
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${order_id}|${payment_id}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex')); }
  catch { return false; }
}

// ---------- Orders (Web & Android channel via customer auth) ----------
function computeTotals({ items, deliveryFeeRule = true, discount = 0 }) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery_fee = deliveryFeeRule ? (subtotal >= 499 || subtotal === 0 ? 0 : 39) : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * 0.05 * 100) / 100;
  const total = Math.round((taxable + delivery_fee + tax) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, delivery_fee, tax, total };
}

app.post('/api/orders', authRequired, async (req, res) => {
  const { items, address, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, coupon_code, channel } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ detail: 'Empty cart' });

  let discount = 0, coupon = null;
  if (coupon_code) {
    coupon = await Coupon.findOne({ code: coupon_code.toUpperCase(), active: true });
    if (coupon) {
      const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
      if (sub >= (coupon.min_order || 0)) {
        discount = coupon.discount_type === 'percent' ? sub * (coupon.value / 100) : coupon.value;
        if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
        discount = Math.round(discount * 100) / 100;
      }
    }
  }
  const totals = computeTotals({ items, deliveryFeeRule: true, discount });

  let payment_status = 'pending';
  if (payment_method === 'razorpay') {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ detail: 'Missing razorpay data' });
    if (!verifyRzpSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
      return res.status(400).json({ detail: 'Invalid payment signature' });
    payment_status = 'paid';
  }

  const order_no = await nextOrderNo();
  const order = await Order.create({
    user_id: req.user.user_id, items, address,
    channel: channel && ['web', 'android'].includes(channel) ? channel : 'web',
    order_type: 'delivery',
    ...totals, discount, coupon_code: coupon ? coupon.code : null,
    payment_method, payment_status, status: 'placed',
    razorpay_order_id, razorpay_payment_id, order_no,
  });
  if (coupon) await Coupon.updateOne({ code: coupon.code }, { $inc: { redemptions: 1 } });
  res.json(order.toObject());
});

app.get('/api/orders/me', authRequired, async (req, res) => {
  const orders = await Order.find({ user_id: req.user.user_id }).sort({ created_at: -1 }).lean();
  res.json(orders);
});

app.get('/api/orders/:oid', authRequired, async (req, res) => {
  const o = await Order.findOne({ id: req.params.oid }).lean();
  if (!o) return res.status(404).json({ detail: 'Not found' });
  if (o.user_id !== req.user.user_id && req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ detail: 'Forbidden' });
  }
  res.json(o);
});

// ---------- POS (in-shop counter) ----------
app.post('/api/pos/orders', adminOnly, async (req, res) => {
  const { items, customer_name, customer_phone, order_type, table_no, payment_method } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ detail: 'Empty cart' });
  const totals = computeTotals({ items, deliveryFeeRule: false });
  const order_no = await nextOrderNo();
  const order = await Order.create({
    user_id: req.user.user_id,
    items, channel: 'pos',
    order_type: order_type || 'takeaway',
    table_no: table_no || null,
    pos_customer_name: customer_name || 'Walk-in',
    pos_customer_phone: customer_phone || '',
    ...totals,
    payment_method: payment_method || 'cash',
    payment_status: 'paid',
    status: 'preparing',
    order_no,
  });
  res.json(order.toObject());
});

app.get('/api/pos/orders', adminOnly, async (_req, res) => {
  const orders = await Order.find({ channel: 'pos' }).sort({ created_at: -1 }).limit(50).lean();
  res.json(orders);
});

// ---------- Admin ----------
app.get('/api/admin/orders', adminOnly, async (req, res) => {
  const q = {};
  if (req.query.channel) q.channel = req.query.channel;
  if (req.query.status) q.status = req.query.status;
  const orders = await Order.find(q).sort({ created_at: -1 }).limit(500).lean();
  res.json(orders);
});

app.put('/api/admin/orders/:oid/status', adminOnly, async (req, res) => {
  const valid = new Set(['placed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']);
  if (!valid.has(req.body?.status)) return res.status(400).json({ detail: 'Invalid status' });
  const r = await Order.updateOne({ id: req.params.oid }, { $set: { status: req.body.status } });
  if (!r.matchedCount) return res.status(404).json({ detail: 'Not found' });
  res.json({ ok: true });
});

app.get('/api/admin/stats', adminOnly, async (_req, res) => {
  const [total_orders, delivered, active, revenueAgg, byChannel] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ status: { $in: ['placed', 'preparing', 'out_for_delivery'] } }),
    Order.aggregate([
      { $match: { $or: [{ payment_status: 'paid' }, { status: 'delivered' }] } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
    Order.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
  ]);
  const channels = {};
  byChannel.forEach(c => { channels[c._id] = { count: c.count, revenue: Math.round(c.revenue * 100) / 100 }; });
  res.json({
    total_orders, delivered, active,
    revenue: Math.round(((revenueAgg[0]?.revenue) || 0) * 100) / 100,
    channels,
  });
});

// ---------- Seed ----------
app.post('/api/seed', async (_req, res) => {
  const existing = await Dish.countDocuments({});
  if (existing > 0) return res.json({ ok: true, message: 'Already seeded' });

  const admin = await User.findOne({ email: 'admin@mukhtar.com' });
  if (!admin) {
    const hash = await bcrypt.hash('Admin@123', 10);
    await User.create({ name: 'Admin', email: 'admin@mukhtar.com', password: hash, role: 'admin', provider: 'local' });
  }

  const cats = [
    { name: 'Biryani', image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', sort: 1 },
    { name: 'Tandoor', image_url: 'https://images.unsplash.com/photo-1617692855027-33b14f061079?w=400', sort: 2 },
    { name: 'Curries', image_url: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400', sort: 3 },
    { name: 'Chinese', image_url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400', sort: 4 },
    { name: 'Desserts', image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', sort: 5 },
    { name: 'Beverages', image_url: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400', sort: 6 },
  ];
  const createdCats = await Category.insertMany(cats);
  const byName = Object.fromEntries(createdCats.map(c => [c.name, c.id]));

  const dishes = [
    { name: 'Hyderabadi Chicken Biryani', description: 'Fragrant basmati rice with tender chicken, saffron and aromatic spices.', price: 289, category_id: byName['Biryani'], image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600', veg: false, spice_level: 'medium' },
    { name: 'Veg Dum Biryani', description: 'Basmati rice slow-cooked with garden vegetables and warm spices.', price: 229, category_id: byName['Biryani'], image_url: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600', veg: true, spice_level: 'mild' },
    { name: 'Mutton Biryani', description: 'Slow-cooked mutton with long-grain rice, caramelised onions and mint.', price: 349, category_id: byName['Biryani'], image_url: 'https://images.unsplash.com/photo-1633945274309-2c16c76e93ee?w=600', veg: false, spice_level: 'hot' },
    { name: 'Tandoori Chicken (Half)', description: 'Yogurt-marinated chicken chargrilled in the clay oven.', price: 259, category_id: byName['Tandoor'], image_url: 'https://images.unsplash.com/photo-1617692855027-33b14f061079?w=600', veg: false, spice_level: 'medium' },
    { name: 'Paneer Tikka', description: 'Cottage cheese cubes marinated in spiced yogurt, grilled to smoky perfection.', price: 219, category_id: byName['Tandoor'], image_url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600', veg: true, spice_level: 'medium' },
    { name: 'Butter Chicken', description: 'Creamy tomato gravy with tender chicken pieces and a hint of butter.', price: 279, category_id: byName['Curries'], image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600', veg: false, spice_level: 'mild' },
    { name: 'Dal Makhani', description: 'Black lentils slow-simmered overnight with butter and cream.', price: 189, category_id: byName['Curries'], image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600', veg: true, spice_level: 'mild' },
    { name: 'Paneer Butter Masala', description: 'Cottage cheese in silky tomato-cashew gravy.', price: 239, category_id: byName['Curries'], image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600', veg: true, spice_level: 'mild' },
    { name: 'Chilli Chicken (Dry)', description: 'Indo-Chinese classic with soy, garlic and green chillies.', price: 249, category_id: byName['Chinese'], image_url: 'https://images.unsplash.com/photo-1626202373352-b5a6b3d746f6?w=600', veg: false, spice_level: 'hot' },
    { name: 'Veg Hakka Noodles', description: 'Wok-tossed noodles with crunchy vegetables and soy.', price: 179, category_id: byName['Chinese'], image_url: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600', veg: true, spice_level: 'mild' },
    { name: 'Gulab Jamun (2 pc)', description: 'Soft milk dumplings soaked in cardamom-rose syrup.', price: 79, category_id: byName['Desserts'], image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', veg: true, spice_level: 'mild' },
    { name: 'Mango Lassi', description: 'Chilled sweet yogurt drink blended with alphonso mango.', price: 99, category_id: byName['Beverages'], image_url: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=600', veg: true, spice_level: 'mild' },
  ];
  await Dish.insertMany(dishes);

  // Sample coupon
  const c = await Coupon.findOne({ code: 'MUKHTAR20' });
  if (!c) await Coupon.create({ code: 'MUKHTAR20', discount_type: 'percent', value: 20, min_order: 299, max_discount: 150, active: true });

  res.json({ ok: true, categories: cats.length, dishes: dishes.length });
});

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ detail: err.message || 'Server error' });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[express] listening on 127.0.0.1:${PORT}`);
});

process.on('SIGTERM', () => { console.log('SIGTERM'); process.exit(0); });
