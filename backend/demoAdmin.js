import bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';

export const DEMO_ADMIN_EMAIL = 'demo@cloudkitchen.local';
export const DEMO_ADMIN_NAME = 'Demo Administrator';

export const DEMO_PERSONAS = {
  admin: { email: DEMO_ADMIN_EMAIL, name: DEMO_ADMIN_NAME, role: 'admin' },
  staff: { email: 'demo-staff@cloudkitchen.local', name: 'Demo Staff', role: 'staff' },
  chef: { email: 'demo-chef@cloudkitchen.local', name: 'Demo Chef', role: 'chef' },
  salesman: { email: 'demo-sales@cloudkitchen.local', name: 'Demo Sales', role: 'salesman' },
};

export const DEMO_PERSONA_EMAILS = Object.values(DEMO_PERSONAS).map(persona => persona.email);

export async function ensureDemoCustomer(User, sessionId) {
  const safeId = String(sessionId || randomUUID()).trim();
  const hash = createHash('sha256').update(safeId).digest('hex').slice(0, 24);
  const email = `demo-customer-${hash}@cloudkitchen.local`;

  let customer = await User.findOne({ email });
  if (!customer) {
    const password = await bcrypt.hash(randomUUID(), 10);
    customer = await User.create({
      name: 'Demo Customer',
      email,
      password,
      role: 'customer',
      provider: 'local',
    });
  }
  return customer;
}

async function ensurePersona(User, persona) {
  let user = await User.findOne({ email: persona.email });

  if (!user) {
    const password = await bcrypt.hash(randomUUID(), 10);
    user = await User.create({
      name: persona.name,
      email: persona.email,
      password,
      role: persona.role,
      provider: 'local',
    });
    return user;
  }

  let changed = false;
  if (user.name !== persona.name) {
    user.name = persona.name;
    changed = true;
  }
  if (user.role !== persona.role) {
    user.role = persona.role;
    changed = true;
  }
  if (user.provider !== 'local') {
    user.provider = 'local';
    changed = true;
  }

  if (changed) await user.save();
  return user;
}

/**
 * Ensure the fixed Demo administrator exists and always has admin access.
 * The generated password is intentionally not exposed because Demo login
 * is token-based and does not require a password.
 */
export async function ensureDemoAdmin(User) {
  return ensurePersona(User, DEMO_PERSONAS.admin);
}

/**
 * Ensure a fixed Demo operational persona exists.
 * Demo persona passwords are never exposed; access is granted only through
 * the Demo-only role-switch endpoint.
 */
export async function ensureDemoPersona(User, role) {
  const persona = DEMO_PERSONAS[role];
  if (!persona) return null;
  return ensurePersona(User, persona);
}
