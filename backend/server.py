from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import razorpay
import hmac
import hashlib
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

RAZORPAY_KEY_ID = os.environ['RAZORPAY_KEY_ID']
RAZORPAY_KEY_SECRET = os.environ['RAZORPAY_KEY_SECRET']
rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Models ----------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    user_id: str
    name: str
    email: str
    role: str = "customer"
    picture: Optional[str] = None

class CategoryInput(BaseModel):
    name: str
    image_url: Optional[str] = None

class Category(BaseModel):
    id: str
    name: str
    image_url: Optional[str] = None

class DishInput(BaseModel):
    name: str
    description: str
    price: float
    category_id: str
    image_url: Optional[str] = None
    veg: bool = True
    spice_level: str = "medium"  # mild | medium | hot
    is_available: bool = True

class Dish(DishInput):
    id: str

class CartItem(BaseModel):
    dish_id: str
    name: str
    price: float
    qty: int
    image_url: Optional[str] = None

class Address(BaseModel):
    full_name: str
    phone: str
    line1: str
    city: str
    pincode: str
    notes: Optional[str] = None

class OrderInput(BaseModel):
    items: List[CartItem]
    address: Address
    payment_method: str  # cod | razorpay
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None

class Order(BaseModel):
    id: str
    user_id: str
    items: List[CartItem]
    address: Address
    subtotal: float
    delivery_fee: float
    tax: float
    total: float
    payment_method: str
    payment_status: str  # pending | paid | failed
    status: str  # placed | preparing | out_for_delivery | delivered | cancelled
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: str
    updated_at: str

class StatusUpdate(BaseModel):
    status: str

class RazorpayOrderInput(BaseModel):
    amount: float  # in rupees

# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_jwt(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
) -> dict:
    # Try JWT bearer
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]

    # Try JWT decode
    if token:
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            uid = payload.get("user_id")
            user = await db.users.find_one({"user_id": uid}, {"_id": 0, "password": 0})
            if user:
                return user
        except jwt.PyJWTError:
            pass
        # Try as Emergent session token
        sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
        if sess:
            expires_at = sess.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password": 0})
                if user:
                    return user

    # Try cookie session_token
    if session_token:
        sess = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if sess:
            expires_at = sess.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0, "password": 0})
                if user:
                    return user

    raise HTTPException(status_code=401, detail="Not authenticated")

async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---------- Auth Routes ----------
@api_router.post("/auth/register")
async def register(inp: RegisterInput):
    existing = await db.users.find_one({"email": inp.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "name": inp.name,
        "email": inp.email.lower(),
        "password": hash_password(inp.password),
        "role": "customer",
        "picture": None,
        "provider": "local",
        "created_at": now_iso()
    }
    await db.users.insert_one(doc)
    token = create_jwt(user_id)
    return {"token": token, "user": {"user_id": user_id, "name": inp.name, "email": inp.email.lower(), "role": "customer", "picture": None}}

@api_router.post("/auth/login")
async def login(inp: LoginInput):
    user = await db.users.find_one({"email": inp.email.lower()}, {"_id": 0})
    if not user or not user.get("password") or not verify_password(inp.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_jwt(user["user_id"])
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"], "name": user["name"], "email": user["email"],
            "role": user.get("role", "customer"), "picture": user.get("picture")
        }
    }

@api_router.post("/auth/session")
async def emergent_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        data = r.json()

    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user = {
            "user_id": user_id,
            "name": data["name"],
            "email": email,
            "picture": data.get("picture"),
            "role": "customer",
            "provider": "google",
            "created_at": now_iso()
        }
        await db.users.insert_one(user)
    else:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"picture": data.get("picture"), "name": data["name"]}})

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": now_iso()
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    return {
        "user": {
            "user_id": user["user_id"], "name": user["name"], "email": user["email"],
            "role": user.get("role", "customer"), "picture": user.get("picture")
        },
        "token": session_token
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"], "name": user["name"], "email": user["email"],
        "role": user.get("role", "customer"), "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ---------- Categories ----------
@api_router.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(200)
    return cats

@api_router.post("/categories")
async def create_category(inp: CategoryInput, _: dict = Depends(require_admin)):
    cid = f"cat_{uuid.uuid4().hex[:10]}"
    doc = {"id": cid, "name": inp.name, "image_url": inp.image_url}
    await db.categories.insert_one(doc.copy())
    return doc

@api_router.put("/categories/{cid}")
async def update_category(cid: str, inp: CategoryInput, _: dict = Depends(require_admin)):
    res = await db.categories.update_one({"id": cid}, {"$set": inp.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.delete("/categories/{cid}")
async def delete_category(cid: str, _: dict = Depends(require_admin)):
    await db.categories.delete_one({"id": cid})
    return {"ok": True}

# ---------- Dishes ----------
@api_router.get("/dishes")
async def list_dishes(category_id: Optional[str] = None, q: Optional[str] = None):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    dishes = await db.dishes.find(query, {"_id": 0}).to_list(500)
    return dishes

@api_router.get("/dishes/{did}")
async def get_dish(did: str):
    d = await db.dishes.find_one({"id": did}, {"_id": 0})
    if not d:
        raise HTTPException(404, "Not found")
    return d

@api_router.post("/dishes")
async def create_dish(inp: DishInput, _: dict = Depends(require_admin)):
    did = f"dish_{uuid.uuid4().hex[:10]}"
    doc = {"id": did, **inp.model_dump()}
    await db.dishes.insert_one(doc.copy())
    return doc

@api_router.put("/dishes/{did}")
async def update_dish(did: str, inp: DishInput, _: dict = Depends(require_admin)):
    res = await db.dishes.update_one({"id": did}, {"$set": inp.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.delete("/dishes/{did}")
async def delete_dish(did: str, _: dict = Depends(require_admin)):
    await db.dishes.delete_one({"id": did})
    return {"ok": True}

# ---------- Payments (Razorpay) ----------
@api_router.get("/payments/razorpay/config")
async def razorpay_config():
    return {"key_id": RAZORPAY_KEY_ID}

@api_router.post("/payments/razorpay/order")
async def create_razorpay_order(inp: RazorpayOrderInput, user: dict = Depends(get_current_user)):
    amount_paise = int(round(inp.amount * 100))
    order = rzp_client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "payment_capture": 1,
        "receipt": f"rcpt_{uuid.uuid4().hex[:10]}"
    })
    return order

def verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    payload = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

# ---------- Orders ----------
@api_router.post("/orders")
async def create_order(inp: OrderInput, user: dict = Depends(get_current_user)):
    subtotal = sum(i.price * i.qty for i in inp.items)
    if subtotal <= 0 or not inp.items:
        raise HTTPException(400, "Empty cart")
    delivery_fee = 0 if subtotal >= 499 else 39
    tax = round(subtotal * 0.05, 2)
    total = round(subtotal + delivery_fee + tax, 2)
    payment_status = "pending"

    if inp.payment_method == "razorpay":
        if not (inp.razorpay_order_id and inp.razorpay_payment_id and inp.razorpay_signature):
            raise HTTPException(400, "Missing razorpay data")
        if not verify_signature(inp.razorpay_order_id, inp.razorpay_payment_id, inp.razorpay_signature):
            raise HTTPException(400, "Invalid payment signature")
        payment_status = "paid"

    oid = f"ord_{uuid.uuid4().hex[:10]}"
    doc = {
        "id": oid,
        "user_id": user["user_id"],
        "items": [i.model_dump() for i in inp.items],
        "address": inp.address.model_dump(),
        "subtotal": round(subtotal, 2),
        "delivery_fee": delivery_fee,
        "tax": tax,
        "total": total,
        "payment_method": inp.payment_method,
        "payment_status": payment_status,
        "status": "placed",
        "razorpay_order_id": inp.razorpay_order_id,
        "razorpay_payment_id": inp.razorpay_payment_id,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.orders.insert_one(doc.copy())
    return doc

@api_router.get("/orders/me")
async def my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders

@api_router.get("/orders/{oid}")
async def get_order(oid: str, user: dict = Depends(get_current_user)):
    o = await db.orders.find_one({"id": oid}, {"_id": 0})
    if not o:
        raise HTTPException(404, "Not found")
    if o["user_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(403, "Forbidden")
    return o

@api_router.get("/admin/orders")
async def admin_orders(_: dict = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.put("/admin/orders/{oid}/status")
async def update_order_status(oid: str, upd: StatusUpdate, _: dict = Depends(require_admin)):
    valid = {"placed", "preparing", "out_for_delivery", "delivered", "cancelled"}
    if upd.status not in valid:
        raise HTTPException(400, "Invalid status")
    res = await db.orders.update_one({"id": oid}, {"$set": {"status": upd.status, "updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}

@api_router.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    total_orders = len(orders)
    revenue = sum(o["total"] for o in orders if o.get("payment_status") == "paid" or o.get("status") == "delivered")
    active = sum(1 for o in orders if o["status"] in ("placed", "preparing", "out_for_delivery"))
    delivered = sum(1 for o in orders if o["status"] == "delivered")
    return {"total_orders": total_orders, "revenue": round(revenue, 2), "active": active, "delivered": delivered}

# ---------- Seed ----------
@api_router.post("/seed")
async def seed_data():
    # Only seed if empty
    existing = await db.dishes.count_documents({})
    if existing > 0:
        return {"ok": True, "message": "Already seeded"}

    # Ensure admin
    admin = await db.users.find_one({"email": "admin@mukhtar.com"})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "name": "Admin",
            "email": "admin@mukhtar.com",
            "password": hash_password("Admin@123"),
            "role": "admin",
            "provider": "local",
            "created_at": now_iso()
        })

    cats = [
        {"id": f"cat_{uuid.uuid4().hex[:10]}", "name": "Biryani", "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400"},
        {"id": f"cat_{uuid.uuid4().hex[:10]}", "name": "Tandoor", "image_url": "https://images.unsplash.com/photo-1617692855027-33b14f061079?w=400"},
        {"id": f"cat_{uuid.uuid4().hex[:10]}", "name": "Curries", "image_url": "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400"},
        {"id": f"cat_{uuid.uuid4().hex[:10]}", "name": "Chinese", "image_url": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400"},
        {"id": f"cat_{uuid.uuid4().hex[:10]}", "name": "Desserts", "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400"},
        {"id": f"cat_{uuid.uuid4().hex[:10]}", "name": "Beverages", "image_url": "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=400"},
    ]
    await db.categories.insert_many([c.copy() for c in cats])
    cat_by_name = {c["name"]: c["id"] for c in cats}

    dishes = [
        {"name": "Hyderabadi Chicken Biryani", "description": "Fragrant basmati rice layered with tender chicken, saffron, and aromatic spices.", "price": 289, "category_id": cat_by_name["Biryani"], "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600", "veg": False, "spice_level": "medium"},
        {"name": "Veg Dum Biryani", "description": "Basmati rice slow-cooked with garden vegetables and warm spices.", "price": 229, "category_id": cat_by_name["Biryani"], "image_url": "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=600", "veg": True, "spice_level": "mild"},
        {"name": "Mutton Biryani", "description": "Slow-cooked mutton with long-grain rice, caramelised onions and mint.", "price": 349, "category_id": cat_by_name["Biryani"], "image_url": "https://images.unsplash.com/photo-1633945274309-2c16c76e93ee?w=600", "veg": False, "spice_level": "hot"},
        {"name": "Tandoori Chicken (Half)", "description": "Yogurt-marinated chicken chargrilled in the clay oven.", "price": 259, "category_id": cat_by_name["Tandoor"], "image_url": "https://images.unsplash.com/photo-1617692855027-33b14f061079?w=600", "veg": False, "spice_level": "medium"},
        {"name": "Paneer Tikka", "description": "Cottage cheese cubes marinated in spiced yogurt, grilled to smoky perfection.", "price": 219, "category_id": cat_by_name["Tandoor"], "image_url": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600", "veg": True, "spice_level": "medium"},
        {"name": "Butter Chicken", "description": "Creamy tomato gravy with tender chicken pieces and a hint of butter.", "price": 279, "category_id": cat_by_name["Curries"], "image_url": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600", "veg": False, "spice_level": "mild"},
        {"name": "Dal Makhani", "description": "Black lentils slow-simmered overnight with butter and cream.", "price": 189, "category_id": cat_by_name["Curries"], "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600", "veg": True, "spice_level": "mild"},
        {"name": "Paneer Butter Masala", "description": "Cottage cheese in silky tomato-cashew gravy.", "price": 239, "category_id": cat_by_name["Curries"], "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600", "veg": True, "spice_level": "mild"},
        {"name": "Chilli Chicken (Dry)", "description": "Indo-Chinese classic with soy, garlic and green chillies.", "price": 249, "category_id": cat_by_name["Chinese"], "image_url": "https://images.unsplash.com/photo-1626202373352-b5a6b3d746f6?w=600", "veg": False, "spice_level": "hot"},
        {"name": "Veg Hakka Noodles", "description": "Wok-tossed noodles with crunchy vegetables and soy.", "price": 179, "category_id": cat_by_name["Chinese"], "image_url": "https://images.unsplash.com/photo-1552611052-33e04de081de?w=600", "veg": True, "spice_level": "mild"},
        {"name": "Gulab Jamun (2 pc)", "description": "Soft milk dumplings soaked in cardamom-rose syrup.", "price": 79, "category_id": cat_by_name["Desserts"], "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600", "veg": True, "spice_level": "mild"},
        {"name": "Mango Lassi", "description": "Chilled sweet yogurt drink blended with alphonso mango.", "price": 99, "category_id": cat_by_name["Beverages"], "image_url": "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?w=600", "veg": True, "spice_level": "mild"},
    ]
    for d in dishes:
        d["id"] = f"dish_{uuid.uuid4().hex[:10]}"
        d["is_available"] = True
    await db.dishes.insert_many([d.copy() for d in dishes])
    return {"ok": True, "categories": len(cats), "dishes": len(dishes)}

# ---------- App ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
