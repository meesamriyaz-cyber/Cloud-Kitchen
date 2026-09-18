import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export const DEMO_ADMIN_EMAIL = 'demo@cloudkitchen.local';
export const DEMO_ADMIN_NAME = 'Demo Administrator';

/**
 * Ensure the fixed Demo administrator exists and always has admin access.
 * The generated password is intentionally not exposed because Demo login
 * is token-based and does not require a password.
 */
export async function ensureDemoAdmin(User) {
  let admin = await User.findOne({ email: DEMO_ADMIN_EMAIL });

  if (!admin) {
    const password = await bcrypt.hash(randomUUID(), 10);
    admin = await User.create({
      name: DEMO_ADMIN_NAME,
      email: DEMO_ADMIN_EMAIL,
      password,
      role: 'admin',
      provider: 'local',
    });
    return admin;
  }

  let changed = false;
  if (admin.name !== DEMO_ADMIN_NAME) {
    admin.name = DEMO_ADMIN_NAME;
    changed = true;
  }
  if (admin.role !== 'admin') {
    admin.role = 'admin';
    changed = true;
  }
  if (admin.provider !== 'local') {
    admin.provider = 'local';
    changed = true;
  }

  if (changed) await admin.save();
  return admin;
}
