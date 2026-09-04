import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ChefHat, Database, Eye, EyeOff, KeyRound, Loader2, Store, UserRound } from "lucide-react";
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
  mongo_url: "",
  activation_code: "",
  db_name: "restaurant_app",
  admin_name: "",
  admin_email: "",
  admin_password: "",
  confirm_password: "",
};

export default function Setup() {
  const navigate = useNavigate();
  const { applySession } = useAuth();
  const { initializeSetup, testDatabase, status } = useBootstrap();
  const { refreshFirm } = useFirm();
  const [form, setForm] = useState(initialForm);
  const [seedInventory, setSeedInventory] = useState(true);
  const [autoDbName, setAutoDbName] = useState(true);
  const [showMongoUrl, setShowMongoUrl] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activatingLicense, setActivatingLicense] = useState(false);
  const [licenseActivated, setLicenseActivated] = useState(false);

  useEffect(() => {
    if (autoDbName) {
      setForm(prev => ({ ...prev, db_name: databaseNameFromRestaurant(prev.name) }));
    }
  }, [autoDbName, form.name]);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === "db_name") setAutoDbName(false);
    if (field === "mongo_url" || field === "db_name") setConnectionTested(false);
  };

  const testConnection = async () => {
    if (!form.mongo_url.trim()) {
      toast.error("Enter the MongoDB connection URL first");
      return;
    }
    if (!form.db_name.trim()) {
      toast.error("Enter a database name first");
      return;
    }

    setTestingConnection(true);
    setConnectionTested(false);
    try {
      await testDatabase({ mongo_url: form.mongo_url.trim(), db_name: form.db_name.trim() });
      setConnectionTested(true);
      toast.success("MongoDB connection successful");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not connect to MongoDB");
    } finally {
      setTestingConnection(false);
    }
  };

  const activateLicense = async () => {
    const code = form.activation_code.trim().toUpperCase();
    if (!code) { toast.error("Enter the activation code from Cutting Edge Marketplace"); return; }
    setActivatingLicense(true);
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/license/activate`, { code });
      setLicenseActivated(true);
      toast.success("Application activated");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Activation failed");
    } finally {
      setActivatingLicense(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!licenseActivated) {
      toast.error("Activate the application before initialization");
      return;
    }
    if (!form.mongo_url.trim()) {
      toast.error("MongoDB connection URL is required");
      return;
    }
    if (form.admin_password !== form.confirm_password) {
      toast.error("Admin passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const result = await initializeSetup({
        mongo_url: form.mongo_url.trim(),
        db_name: form.db_name.trim(),
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
            <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Create the restaurant profile, connect its database, admin login, and starter inventory.</p>
          </div>
          <Button type="submit" disabled={saving || testingConnection} className="rounded-full bg-primary hover:opacity-95 text-white">
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
            {saving ? "Initializing..." : "Initialize App"}
          </Button>
        </div>

        {status?.mongo_url_configured && status?.database === "connected" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            A MongoDB connection is already configured for this installation.
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Enter the restaurant's MongoDB connection below. The connection URL is handled by the backend and is never returned to the customer-facing React application.
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

        <section className="soft-panel p-5 md:p-6 border-primary/20 bg-primary/5">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2"><KeyRound size={18} /> Application Activation</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Generate an activation code from your Cutting Edge Marketplace account and enter it here.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3">
            <Input value={form.activation_code} onChange={e => { setLicenseActivated(false); update("activation_code", e.target.value); }} placeholder="10-character activation code" maxLength={10} className="h-11 rounded-xl font-mono tracking-widest uppercase" />
            <Button type="button" disabled={activatingLicense || saving || licenseActivated} onClick={activateLicense} className="rounded-xl">
              {activatingLicense ? <Loader2 size={16} className="mr-2 animate-spin" /> : <KeyRound size={16} className="mr-2" />}
              {licenseActivated ? "Activated" : activatingLicense ? "Activating..." : "Activate"}
            </Button>
          </div>
          {licenseActivated && <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700"><CheckCircle2 size={16} /> License verified for this device</p>}
        </section>
        <section className="grid gap-5 md:grid-cols-2">
          <div className="soft-panel p-5 md:p-6">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Database size={18} /> Database</h2>
            <div className="mt-5 space-y-4">
              <div>
                <Label>MongoDB connection URL</Label>
                <div className="relative mt-1">
                  <Input
                    required
                    type={showMongoUrl ? "text" : "password"}
                    value={form.mongo_url}
                    onChange={e => update("mongo_url", e.target.value)}
                    placeholder="mongodb+srv://username:password@cluster.mongodb.net/"
                    autoComplete="off"
                    className="h-11 rounded-xl pr-11 font-mono text-sm"
                  />
                  <button type="button" onClick={() => setShowMongoUrl(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-800" aria-label={showMongoUrl ? "Hide MongoDB URL" : "Show MongoDB URL"}>
                    {showMongoUrl ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5">Use your MongoDB Atlas or self-hosted MongoDB connection string. Keep the credentials private.</p>
              </div>
              <div>
                <Label>Database name</Label>
                <Input required value={form.db_name} onChange={e => update("db_name", e.target.value)} className="mt-1 h-11 rounded-xl font-mono" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Button type="button" variant="outline" disabled={testingConnection || saving} onClick={testConnection} className="rounded-xl">
                  {testingConnection ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Database size={16} className="mr-2" />}
                  {testingConnection ? "Testing..." : "Test Connection"}
                </Button>
                {connectionTested && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
                    <CheckCircle2 size={16} /> Connection verified
                  </span>
                )}
              </div>
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
