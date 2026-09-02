import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChefHat, Database, Loader2, Store, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useBootstrap } from "@/context/BootstrapContext";
import { useFirm } from "@/context/FirmContext";

function databaseNameFromRestaurant(name) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 63);
  return normalized || "restaurant_app";
}

const initialForm = {
  name: "",
  short_name: "",
  business_type: "Restaurant",
  tagline: "Fresh food, made for every order",
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  gst: "",
  fssai: "",
  upi_id: "",
  db_name: "restaurant_app",
  admin_name: "",
  admin_email: "",
  admin_password: "",
  confirm_password: "",
};

export default function Setup() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const { initializeSetup, status } = useBootstrap();
  const { refreshFirm } = useFirm();
  const [form, setForm] = useState(initialForm);
  const [seedInventory, setSeedInventory] = useState(true);
  const [autoDbName, setAutoDbName] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (autoDbName) {
      setForm(prev => ({ ...prev, db_name: databaseNameFromRestaurant(prev.name) }));
    }
  }, [autoDbName, form.name]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "db_name") setAutoDbName(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!status?.mongo_url_configured) {
      toast.error("MongoDB URL is missing in backend/.env");
      return;
    }
    if (form.admin_password !== form.confirm_password) {
      toast.error("Admin passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const result = await initializeSetup({
        db_name: form.db_name,
        seed_inventory: seedInventory,
        firm: {
          name: form.name,
          short_name: form.short_name || form.name,
          business_type: form.business_type,
          tagline: form.tagline,
          address: form.address,
          city: form.city,
          state: form.state,
          phone: form.phone,
          email: form.email,
          website: form.website,
          gst: form.gst,
          fssai: form.fssai,
          upi_id: form.upi_id,
        },
        admin: {
          name: form.admin_name,
          email: form.admin_email,
          password: form.admin_password,
        },
      });
      applySession(result.token, result.user);
      await refreshFirm();
      toast.success("Restaurant initialized");
      navigate("/admin", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Setup failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-stone-900 px-5 py-8">
      <form onSubmit={submit} className="max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
              <ChefHat size={13} /> First-run setup
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">Initialize Restaurant</h1>
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Create the restaurant profile, database, admin login, and starter inventory.</p>
          </div>
          <Button type="submit" disabled={saving} className="rounded-full bg-primary hover:opacity-95 text-white">
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
            {saving ? "Initializing..." : "Initialize App"}
          </Button>
        </div>

        {!status?.mongo_url_configured && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Add `RESTAURANT_APP_MONGO_URI` or `MONGO_URI` to `backend/.env`, then restart the app.
          </div>
        )}

        <section className="soft-panel p-5 md:p-6">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Store size={18} /> Restaurant Details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <Label>Restaurant name</Label>
              <Input required value={form.name} onChange={e => update("name", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>Short name</Label>
              <Input value={form.short_name} onChange={e => update("short_name", e.target.value)} placeholder={form.name || "Shown in header"} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>Business type</Label>
              <Input value={form.business_type} onChange={e => update("business_type", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={e => update("tagline", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea required value={form.address} onChange={e => update("address", e.target.value)} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label>City</Label>
              <Input required value={form.city} onChange={e => update("city", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>State / Pincode</Label>
              <Input required value={form.state} onChange={e => update("state", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input required value={form.phone} onChange={e => update("phone", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>GST</Label>
              <Input value={form.gst} onChange={e => update("gst", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>FSSAI</Label>
              <Input value={form.fssai} onChange={e => update("fssai", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>Website</Label>
              <Input value={form.website} onChange={e => update("website", e.target.value)} className="mt-1 h-11 rounded-xl" />
            </div>
            <div>
              <Label>UPI ID</Label>
              <Input value={form.upi_id} onChange={e => update("upi_id", e.target.value)} placeholder="restaurant@bank" className="mt-1 h-11 rounded-xl" />
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="soft-panel p-5 md:p-6">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Database size={18} /> Database</h2>
            <div className="mt-5">
              <Label>Database name</Label>
              <Input required value={form.db_name} onChange={e => update("db_name", e.target.value)} className="mt-1 h-11 rounded-xl font-mono" />
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl border border-stone-200 dark:border-stone-700 p-3 text-sm">
              <Checkbox checked={seedInventory} onCheckedChange={(checked) => setSeedInventory(Boolean(checked))} />
              <span>
                <span className="block font-medium">Create starter menu categories</span>
                <span className="block text-xs text-stone-500 dark:text-stone-400 mt-1">Starters, main course, rice, breads, beverages, and desserts.</span>
              </span>
            </label>
          </div>

          <div className="soft-panel p-5 md:p-6">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2"><UserRound size={18} /> Admin Login</h2>
            <div className="mt-5 space-y-4">
              <div>
                <Label>Admin name</Label>
                <Input required value={form.admin_name} onChange={e => update("admin_name", e.target.value)} className="mt-1 h-11 rounded-xl" />
              </div>
              <div>
                <Label>Admin email</Label>
                <Input required type="email" value={form.admin_email} onChange={e => update("admin_email", e.target.value)} className="mt-1 h-11 rounded-xl" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Password</Label>
                  <Input required minLength={6} type="password" value={form.admin_password} onChange={e => update("admin_password", e.target.value)} className="mt-1 h-11 rounded-xl" />
                </div>
                <div>
                  <Label>Confirm</Label>
                  <Input required minLength={6} type="password" value={form.confirm_password} onChange={e => update("confirm_password", e.target.value)} className="mt-1 h-11 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
