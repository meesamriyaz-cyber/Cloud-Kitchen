import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { randomUUID } from 'crypto';
import multer from 'multer';

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || '8002', 10);
const MONGO_URL = process.env.MUKHTAR_KITCHEN__MONGO_URI ;
const DB_NAME = process.env.DB_NAME || 'mukhtar_kitchen';
const JWT_SECRET = process.env.JWT_SECRET;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_ENABLED = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
const ORDER_STATUSES = ['placed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
const ORDER_STATUS_TRANSITIONS = {
  placed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};
const ORDER_STATUS_LABELS = {
  placed: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const STAFF_ROLES = new Set(['admin', 'staff']);
const KITCHEN_ROLES = new Set(['admin', 'staff', 'chef']);
if (!JWT_SECRET) {
  console.error('[config] JWT_SECRET is required. Set it in backend/.env before starting the API.');
  process.exit(1);
}

if (!RAZORPAY_ENABLED) {
  console.warn('[config] Razorpay credentials are not configured. Online payments will be disabled.');
}

const rzp = RAZORPAY_ENABLED
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_ENABLED = Boolean(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET &&
  CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  CLOUDINARY_API_KEY !== 'your_api_key' &&
  CLOUDINARY_API_SECRET !== 'your_api_secret'
);

if (!CLOUDINARY_ENABLED) {
  console.warn('[config] Cloudinary credentials are not configured. Image uploads will be disabled.');
}

let cloudinaryInstance = null;
if (CLOUDINARY_ENABLED) {
  try {
    const cloudinary = await import('cloudinary');
    cloudinaryInstance = cloudinary.default;
    cloudinaryInstance.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET });
    try {
      await cloudinaryInstance.api.create_folder('mukhtar_kitchen');
      console.log('[cloudinary] ensured folder mukhtar_kitchen exists');
    } catch (folderError) {
      console.warn('[cloudinary] folder check warning', folderError.message);
    }
    console.log('[cloudinary] configured');
  } catch (err) {
    console.warn('[cloudinary] failed to initialize', err.message);
  }
}

let mongoConnected = false;
let mongoConnecting = false;

mongoose.connection.on('connected', () => { mongoConnected = true; });
mongoose.connection.on('disconnected', () => { mongoConnected = false; });
mongoose.connection.on('error', () => { mongoConnected = false; });

async function connectMongo(delay = 5000) {
  if (mongoConnecting) return;
  mongoConnecting = true;
  let attempt = 1;

  while (!mongoConnected) {
    try {
      await mongoose.connect(MONGO_URL, { dbName: DB_NAME });
      mongoConnected = true;
      console.log('[mongo] connected', DB_NAME);
      break;
    } catch (err) {
      mongoConnected = false;
      console.error(`[mongo] connect error (attempt ${attempt}):`, err.message);
      attempt += 1;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  mongoConnecting = false;
}

connectMongo();

const uid = (prefix) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

const UserSchema = new mongoose.Schema({
  user_id: { type: String, unique: true, index: true, default: () => uid('user') },
  name: String,
  email: { type: String, lowercase: true, unique: true, index: true },
  password: String,
  role: { type: String, default: 'customer' },
  picture: String,
  provider: { type: String, default: 'local' },
  phone: String,
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
  discount_type: { type: String, default: 'percent' },
  value: Number,
  min_order: { type: Number, default: 0 },
  max_discount: { type: Number, default: 0 },
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
  pos_customer_name: String,
  pos_customer_phone: String,
  order_type: { type: String, default: 'delivery' },
  table_no: String,
  subtotal: Number,
  discount: { type: Number, default: 0 },
  coupon_code: String,
  delivery_fee: { type: Number, default: 0 },
  tax: Number,
  total: Number,
  payment_method: String,
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
const Category = mongoose.model('Category', CategorySchema);
const Dish = mongoose.model('Dish', DishSchema);
const Coupon = mongoose.model('Coupon', CouponSchema);
const Order = mongoose.model('Order', OrderSchema);
const Counter = mongoose.model('Counter', CounterSchema);

async function nextOrderNo() {
  const c = await Counter.findByIdAndUpdate('order_no', { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}

const app = express();
const corsOrigins = (process.env.CORS_ORIGINS || (NODE_ENV === 'production' ? '' : 'http://localhost:3000'))
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (corsOrigins.includes('*') || corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  if (!mongoConnected && req.path !== '/api/health') {
    return res.status(503).json({ detail: 'Database unavailable - please start MongoDB' });
  }
  next();
});

app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`); next(); });

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
    } catch { /* invalid token */ }
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
    if (!STAFF_ROLES.has(req.user.role)) return res.status(403).json({ detail: 'Staff only' });
    next();
  });
}

function posAccess(req, res, next) {
  authRequired(req, res, () => {
    if (!['admin', 'staff', 'salesman'].includes(req.user.role)) return res.status(403).json({ detail: 'POS access only' });
    next();
  });
}

function kitchenAccess(req, res, next) {
  authRequired(req, res, () => {
    if (!KITCHEN_ROLES.has(req.user.role)) return res.status(403).json({ detail: 'Kitchen access only' });
    next();
  });
}

function orderViewAccess(req, res, next) {
  authRequired(req, res, () => {
    if (!['admin', 'staff', 'salesman', 'chef'].includes(req.user.role)) return res.status(403).json({ detail: 'Order view access only' });
    next();
  });
}

function adminStrict(req, res, next) {
  authRequired(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ detail: 'Admin only' });
    next();
  });
}

function transitionOrderStatus(order, newStatus) {
  if (!ORDER_STATUSES.includes(newStatus)) {
    return { ok: false, error: 'Invalid status' };
  }
  if (order.status === newStatus) {
    return { ok: true, error: null };
  }
  const allowed = ORDER_STATUS_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    return { ok: false, error: `Cannot transition from ${ORDER_STATUS_LABELS[order.status] || order.status} to ${ORDER_STATUS_LABELS[newStatus] || newStatus}` };
  }
  order.status = newStatus;
  if (newStatus === 'delivered' && order.payment_status !== 'paid') {
    if (['cod', 'cash', 'upi', 'card'].includes(order.payment_method)) {
      order.payment_status = 'paid';
    }
  }
  return { ok: true, error: null };
}

function publicUser(u) {
  return { user_id: u.user_id, name: u.name, email: u.email, role: u.role || 'customer', picture: u.picture || null, phone: u.phone || '' };
}

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  stack: 'MERN',
  database: mongoConnected ? 'connected' : 'disconnected',
}));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.post('/api/upload', adminOnly, upload.single('image'), async (req, res) => {
  if (!cloudinaryInstance) return res.status(503).json({ detail: 'Image uploads are not configured on the server' });
  const file = req.file;
  if (!file) return res.status(400).json({ detail: 'No file uploaded' });
  if (!file.mimetype.startsWith('image/')) return res.status(400).json({ detail: 'Only image files are allowed' });
  try {
    const result = await cloudinaryInstance.uploader.upload(
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
      {
        folder: 'mukhtar_kitchen',
        transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      }
    );
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error('[upload] error', err);
    res.status(500).json({ detail: err.message || 'Upload failed' });
  }
});

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

app.get('/api/auth/me', authRequired, (req, res) => res.json(publicUser(req.user)));

app.post('/api/auth/logout', async (_req, res) => {
  res.json({ ok: true });
});

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

app.get('/api/coupons', adminOnly, async (_req, res) => {
  const list = await Coupon.find({}).lean();
  res.json(list);
});
app.post('/api/coupons', adminOnly, async (req, res) => {
  const { code, discount_type, value, min_order, max_discount, active } = req.body || {};
  if (!code || !value) return res.status(400).json({ detail: 'Missing fields' });
  const c = await Coupon.findOne({ code: code.toUpperCase() });
  if (c) {
    c.discount_type = discount_type || c.discount_type;
    c.value = Number(value);
    c.min_order = Number(min_order || 0);
    c.max_discount = Number(max_discount || 0);
    c.active = Boolean(active);
    await c.save();
    return res.json(c.toObject());
  }
  const nc = await Coupon.create({ code: code.toUpperCase(), discount_type: discount_type || 'percent', value: Number(value), min_order: Number(min_order || 0), max_discount: Number(max_discount || 0), active: Boolean(active) });
  res.json(nc.toObject());
});
app.delete('/api/coupons/:code', adminOnly, async (req, res) => {
  await Coupon.deleteOne({ code: req.params.code.toUpperCase() });
  res.json({ ok: true });
});
app.post('/api/coupons/apply', async (req, res) => {
  const { code, subtotal } = req.body || {};
  const c = await Coupon.findOne({ code: (code || '').toUpperCase(), active: true });
  if (!c) return res.status(404).json({ detail: 'Invalid or inactive coupon' });
  if (subtotal < (c.min_order || 0)) return res.status(400).json({ detail: `Minimum order Rs.${c.min_order}` });
  let discount = c.discount_type === 'percent' ? subtotal * (c.value / 100) : c.value;
  if (c.max_discount && discount > c.max_discount) discount = c.max_discount;
  discount = Math.round(discount * 100) / 100;
  res.json({ code: c.code, discount, discount_type: c.discount_type, value: c.value });
});

app.get('/api/payments/razorpay/config', (_req, res) => res.json({ key_id: RAZORPAY_KEY_ID || null, enabled: RAZORPAY_ENABLED }));
app.post('/api/payments/razorpay/order', authRequired, async (req, res) => {
  if (!RAZORPAY_ENABLED || !rzp) return res.status(503).json({ detail: 'Online payments are not configured' });
  const amount = Math.round((req.body.amount || 0) * 100);
  if (!Number.isFinite(amount) || amount < 100) return res.status(400).json({ detail: 'Invalid payment amount' });
  const order = await rzp.orders.create({ amount, currency: 'INR', payment_capture: 1, receipt: `rcpt_${uid('r')}`.slice(0, 40) });
  res.json(order);
});
function verifyRzpSignature(order_id, payment_id, signature) {
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${order_id}|${payment_id}`).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex')); }
  catch { return false; }
}

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function validQty(value) {
  const qty = Number(value);
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return null;
  return qty;
}

async function normaliseOrderItems(items) {
  if (!Array.isArray(items) || !items.length) throw httpError(400, 'Empty cart');
  const ids = items.map(i => i?.dish_id).filter(Boolean);
  if (ids.length !== items.length) throw httpError(400, 'Invalid cart item');

  const dishes = await Dish.find({ id: { $in: [...new Set(ids)] }, is_available: true }).lean();
  const byId = new Map(dishes.map(d => [d.id, d]));

  return items.map(raw => {
    const dish = byId.get(raw.dish_id);
    if (!dish) throw httpError(400, 'One or more dishes are unavailable');
    const qty = validQty(raw.qty);
    if (!qty) throw httpError(400, 'Item quantity must be between 1 and 99');
    return {
      dish_id: dish.id,
      name: dish.name,
      price: roundMoney(dish.price),
      qty,
      image_url: dish.image_url || '',
    };
  });
}

function validateDeliveryAddress(address) {
  const cleaned = {
    full_name: String(address?.full_name || '').trim(),
    phone: String(address?.phone || '').trim(),
    line1: String(address?.line1 || '').trim(),
    city: String(address?.city || '').trim(),
    pincode: String(address?.pincode || '').trim(),
    notes: String(address?.notes || '').trim(),
  };
  if (!cleaned.full_name || !cleaned.phone || !cleaned.line1 || !cleaned.city || !cleaned.pincode) {
    throw httpError(400, 'Missing delivery details');
  }
  return cleaned;
}

function computeTotals({ items, deliveryFeeRule = true, discount = 0 }) {
  const subtotal = roundMoney(items.reduce((s, i) => s + i.price * i.qty, 0));
  const delivery_fee = deliveryFeeRule ? (subtotal >= 499 || subtotal === 0 ? 0 : 39) : 0;
  const taxable = Math.max(0, subtotal - discount);
  const tax = roundMoney(taxable * 0.05);
  const total = roundMoney(taxable + delivery_fee + tax);
  return { subtotal, delivery_fee, tax, total };
}

app.post('/api/orders', authRequired, async (req, res) => {
  const { items, address, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, coupon_code, channel } = req.body || {};
  const orderItems = await normaliseOrderItems(items);
  const deliveryAddress = validateDeliveryAddress(address);

  let discount = 0, coupon = null;
  if (coupon_code) {
    coupon = await Coupon.findOne({ code: coupon_code.toUpperCase(), active: true });
    if (coupon) {
      const sub = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
      if (sub >= (coupon.min_order || 0)) {
        discount = coupon.discount_type === 'percent' ? sub * (coupon.value / 100) : coupon.value;
        if (coupon.max_discount && discount > coupon.max_discount) discount = coupon.max_discount;
        discount = roundMoney(discount);
      }
    }
  }
  const totals = computeTotals({ items: orderItems, deliveryFeeRule: true, discount });

  let payment_status = 'pending';
  if (payment_method === 'razorpay') {
    if (!RAZORPAY_ENABLED || !rzp) return res.status(503).json({ detail: 'Online payments are not configured' });
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ detail: 'Missing razorpay data' });
    if (!verifyRzpSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature))
      return res.status(400).json({ detail: 'Invalid payment signature' });
    const razorpayOrder = await rzp.orders.fetch(razorpay_order_id);
    if (Number(razorpayOrder.amount) !== Math.round(totals.total * 100)) {
      return res.status(400).json({ detail: 'Payment amount does not match order total' });
    }
    payment_status = 'paid';
  } else if (payment_method !== 'cod') {
    return res.status(400).json({ detail: 'Invalid payment method' });
  }

  const order_no = await nextOrderNo();
  const order = await Order.create({
    user_id: req.user.user_id, items: orderItems, address: deliveryAddress,
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

app.post('/api/pos/orders', posAccess, async (req, res) => {
  const { items, customer_name, customer_phone, order_type, table_no, payment_method } = req.body || {};
  const orderItems = await normaliseOrderItems(items);
  const safeOrderType = ['takeaway', 'dine_in', 'delivery'].includes(order_type) ? order_type : 'takeaway';
  const safePaymentMethod = ['cash', 'upi', 'card', 'cod', 'razorpay'].includes(payment_method) ? payment_method : 'cash';
  const totals = computeTotals({ items: orderItems, deliveryFeeRule: safeOrderType === 'delivery' });
  const order_no = await nextOrderNo();
  const order = await Order.create({
    user_id: req.user.user_id,
    items: orderItems,
    channel: 'pos',
    order_type: safeOrderType,
    table_no: safeOrderType === 'dine_in' ? String(table_no || '').trim() || null : null,
    pos_customer_name: String(customer_name || 'Walk-in').trim(),
    pos_customer_phone: String(customer_phone || '').trim(),
    ...totals,
    payment_method: safePaymentMethod,
    payment_status: 'pending',
    status: 'placed',
    order_no,
  });
  res.json(order.toObject());
});

app.post('/api/pos/orders/:id/pay', posAccess, async (req, res) => {
  const order = await Order.findOne({ id: req.params.id });
  if (!order) return res.status(404).json({ detail: 'Order not found' });
  if (order.payment_status === 'paid') return res.json(order.toObject());
  order.payment_status = 'paid';
  await order.save();
  res.json(order.toObject());
});

app.post('/api/pos/orders/:id/payment-link', posAccess, async (req, res) => {
  const order = await Order.findOne({ id: req.params.id });
  if (!order) return res.status(404).json({ detail: 'Order not found' });
  if (!RAZORPAY_ENABLED) return res.status(400).json({ detail: 'Razorpay not configured' });
  try {
    const link = await rzp.paymentLink.create({
      amount: Math.round(order.total * 100),
      currency: 'INR',
      reference_id: order.id,
      description: `Order #${order.order_no} - Mukhtar Cloud Kitchen`,
      notify: { sms: false, email: false },
      reminder_enable: false,
    });
    res.json({ link_url: link.short_url, link_id: link.id });
  } catch (err) {
    console.error('[razorpay] payment link error', err);
    res.status(500).json({ detail: 'Failed to create payment link' });
  }
});

app.post('/api/pos/orders/:id/upi-deep-link', posAccess, async (req, res) => {
  const order = await Order.findOne({ id: req.params.id });
  if (!order) return res.status(404).json({ detail: 'Order not found' });
  const { upi_id = 'mukhtar@okhdfcbank' } = req.body || {};
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upi_id)}&pn=${encodeURIComponent('Mukhtar Cloud Kitchen')}&am=${order.total}&cu=INR&tn=${encodeURIComponent(`Order #${order.order_no}`)}`;
  res.json({ upi_url: upiUrl, upi_id });
});

app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn('[webhook] RAZORPAY_WEBHOOK_SECRET not set, skipping verification');
  } else {
    const expected = crypto.createHmac('sha256', webhookSecret).update(req.body).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature || '', 'hex'))) {
      return res.status(400).json({ detail: 'Invalid signature' });
    }
  }
  let event;
  try { event = JSON.parse(req.body.toString()); } catch { return res.status(400).json({ detail: 'Invalid JSON' }); }
  if (event.event === 'payment.captured' || event.event === 'payment_link.paid') {
    const payment = event.payload?.payment || event.payload?.payment_link?.payment;
    const orderId = payment?.order_id || event.payload?.payment_link?.entity?.order_id;
    if (orderId) {
      Order.findOne({ razorpay_order_id: orderId }).then(order => {
        if (order && order.payment_status !== 'paid') {
          order.payment_status = 'paid';
          order.razorpay_payment_id = payment?.id || event.payload?.payment_link?.entity?.payment_id;
          order.save().then(() => console.log('[webhook] order paid', order.id)).catch(console.error);
        }
      }).catch(console.error);
    }
  }
  res.json({ ok: true });
});

app.get('/api/pos/orders', kitchenAccess, async (_req, res) => {
  const orders = await Order.find({ channel: 'pos' }).sort({ created_at: -1 }).limit(50).lean();
  res.json(orders);
});

app.get('/api/admin/orders', orderViewAccess, async (req, res) => {
  const q = {};
  if (req.query.channel) q.channel = req.query.channel;
  if (req.query.status) q.status = req.query.status;
  const orders = await Order.find(q).sort({ created_at: -1 }).limit(500).lean();
  res.json(orders);
});

app.put('/api/admin/orders/:oid/status', kitchenAccess, async (req, res) => {
  const order = await Order.findOne({ id: req.params.oid });
  if (!order) return res.status(404).json({ detail: 'Not found' });
  const result = transitionOrderStatus(order, req.body?.status);
  if (!result.ok) return res.status(400).json({ detail: result.error });
  await order.save();
  res.json({ ok: true, status: order.status });
});

app.get('/api/admin/stats', adminOnly, async (_req, res) => {
  const [total_orders, delivered, active, revenueAgg, byChannel] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ status: 'delivered' }),
    Order.countDocuments({ status: { $in: ['placed', 'preparing', 'ready', 'out_for_delivery'] } }),
    Order.aggregate([
      { $match: { $or: [{ payment_status: 'paid' }, { status: 'delivered' }] } },
      { $group: { _id: null, revenue: { $sum: '$total' } } },
    ]),
    Order.aggregate([{ $group: { _id: '$channel', count: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
  ]);
  const channels = {};
  byChannel.forEach(c => { channels[c._id || 'unknown'] = { count: c.count, revenue: roundMoney(c.revenue) }; });
  res.json({
    total_orders, delivered, active,
    revenue: roundMoney(revenueAgg[0]?.revenue || 0),
    channels,
  });
});

app.get('/api/admin/users', adminStrict, async (_req, res) => {
  const users = await User.find({}).sort({ created_at: -1 }).lean();
  res.json(users.map(u => ({ ...publicUser(u), phone: u.phone || '', provider: u.provider || 'local' })));
});

app.post('/api/admin/users', adminStrict, async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ detail: 'Missing fields' });
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ detail: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  const u = await User.create({ name, email: email.toLowerCase(), password: hash, role, provider: 'local' });
  res.json({ ...publicUser(u), phone: u.phone || '', provider: u.provider || 'local' });
});

app.put('/api/admin/users/:id', adminStrict, async (req, res) => {
  const u = await User.findOne({ user_id: req.params.id });
  if (!u) return res.status(404).json({ detail: 'Not found' });
  const { name, email, role, password } = req.body || {};
  if (name) u.name = name;
  if (email) u.email = email.toLowerCase();
  if (role) u.role = role;
  if (password) u.password = await bcrypt.hash(password, 10);
  await u.save();
  res.json({ ...publicUser(u), phone: u.phone || '', provider: u.provider || 'local' });
});

app.delete('/api/admin/users/:id', adminStrict, async (req, res) => {
  const r = await User.deleteOne({ user_id: req.params.id });
  if (!r.deletedCount) return res.status(404).json({ detail: 'Not found' });
  res.json({ ok: true });
});

app.get('/api/admin/sales/report', adminOnly, async (req, res) => {
  const { from, to, channel } = req.query;
  const match = {};
  if (from || to) {
    match.created_at = {};
    if (from) match.created_at.$gte = new Date(from);
    if (to) match.created_at.$lte = new Date(to);
  }
  if (channel && ['web', 'pos', 'android'].includes(channel)) match.channel = channel;

  const [revenueAgg, byChannel, byStatus, byDay, topItems] = await Promise.all([
    Order.aggregate([
      { $match: { ...match, $or: [{ payment_status: 'paid' }, { status: 'delivered' }] } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: '$channel', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: '$status', orders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } } } },
      { $sort: { qty: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const channels = {};
  byChannel.forEach(c => { channels[c._id || 'unknown'] = { orders: c.orders, revenue: roundMoney(c.revenue) }; });
  const statuses = {};
  byStatus.forEach(s => { statuses[s._id || 'unknown'] = s.orders; });
  const daily = byDay.map(d => ({ date: d._id, orders: d.orders, revenue: roundMoney(d.revenue) }));
  const items = topItems.map(i => ({ name: i._id, qty: i.qty, revenue: roundMoney(i.revenue) }));

  res.json({
    revenue: roundMoney(revenueAgg[0]?.revenue || 0),
    orders: revenueAgg[0]?.orders || 0,
    channels,
    statuses,
    daily,
    items,
  });
});

app.post('/api/seed', async (_req, res) => {
  const admin = await User.findOne({ email: 'admin@mukhtar.com' });
  if (!admin) {
    const hash = await bcrypt.hash('Admin@123', 10);
    await User.create({ name: 'Admin', email: 'admin@mukhtar.com', password: hash, role: 'admin', provider: 'local' });
  }

  const salesman = await User.findOne({ email: 'salesman@mukhtar.com' });
  if (!salesman) {
    const hash = await bcrypt.hash('Salesman@123', 10);
    await User.create({ name: 'Salesman', email: 'salesman@mukhtar.com', password: hash, role: 'salesman', provider: 'local' });
  }

  const customer = await User.findOne({ email: 'customer@mukhtar.com' });
  if (!customer) {
    const hash = await bcrypt.hash('Customer@123', 10);
    await User.create({ name: 'Customer', email: 'customer@mukhtar.com', password: hash, role: 'customer', provider: 'local' });
  }

  const chef = await User.findOne({ email: 'chef@mukhtar.com' });
  if (!chef) {
    const hash = await bcrypt.hash('Chef@123', 10);
    await User.create({ name: 'Chef', email: 'chef@mukhtar.com', password: hash, role: 'chef', provider: 'local' });
  }

  const existing = await Dish.countDocuments({});
  if (existing > 0) return res.json({ ok: true, message: 'Users seeded', users: { admin: 'admin@mukhtar.com', salesman: 'salesman@mukhtar.com', customer: 'customer@mukhtar.com', chef: 'chef@mukhtar.com' } });

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

  const c = await Coupon.findOne({ code: 'MUKHTAR20' });
  if (!c) await Coupon.create({ code: 'MUKHTAR20', discount_type: 'percent', value: 20, min_order: 299, max_discount: 150, active: true });

  res.json({ ok: true, categories: cats.length, dishes: dishes.length, users: { admin: 'admin@mukhtar.com', salesman: 'salesman@mukhtar.com', customer: 'customer@mukhtar.com', chef: 'chef@mukhtar.com' } });
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
  res.status(status).json({ detail: err.message || 'Server error' });
});

function startServer(port) {
  const server = app.listen(port, '127.0.0.1', () => {
    console.log(`[express] listening on 127.0.0.1:${port}`);
  });
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[express] port ${port} in use, trying ${port + 1}...`);
      server.close(() => startServer(port + 1));
    } else {
      console.error('[express] error', e);
    }
  });
}

startServer(PORT);

process.on('SIGTERM', () => { console.log('SIGTERM'); process.exit(0); });
