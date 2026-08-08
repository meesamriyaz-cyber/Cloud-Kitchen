import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, RefreshCcw, Search, Trash2, Edit, Percent, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ApiUnavailable from "@/components/ApiUnavailable";
import { formatMoney } from "@/lib/format";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const empty = { code: "", discount_type: "percent", value: 0, min_order: 0, max_discount: 0, active: true };

export default function AdminOffers() {
  const [coupons, setCoupons] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/coupons`);
      setCoupons(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load offers.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return coupons.filter(c => {
      if (term && !c.code.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [coupons, q]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c.code);
    setForm({ ...c });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (!form.code || !Number.isFinite(Number(form.value))) {
        toast.error("Code and value are required");
        return;
      }
      const payload = { ...form, value: Number(form.value), min_order: Number(form.min_order || 0), max_discount: Number(form.max_discount || 0) };
      if (editing) {
        await axios.post(`${API}/coupons`, { ...payload, code: editing });
      } else {
        await axios.post(`${API}/coupons`, payload);
      }
      toast.success(editing ? "Offer updated" : "Offer created");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save offer");
    }
  };

  const toggleActive = async (c) => {
    try {
      await axios.post(`${API}/coupons`, { ...c, active: !c.active });
      toast.success(c.active ? "Offer deactivated" : "Offer activated");
      await load();
    } catch (e) {
      toast.error("Failed to update offer");
    }
  };

  const del = async (code) => {
    if (!window.confirm(`Delete offer "${code}"?`)) return;
    try {
      await axios.delete(`${API}/coupons/${code}`);
      toast.success("Offer deleted");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete offer");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600">
            <Tag size={13} /> Offers
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">Manage Offers</h1>
          <p className="text-stone-500 text-sm mt-1">Create, update, and deactivate discount codes and promotions.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="rounded-full bg-stone-900 hover:bg-stone-800" data-testid="admin-add-offer-btn">
              <Plus size={16} className="mr-1" /> Add Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Offer" : "Add Offer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. MUKHTAR20" data-testid="offer-form-code" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger data-testid="offer-form-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Value</Label><Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} data-testid="offer-form-value" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min order (₹)</Label><Input type="number" value={form.min_order || 0} onChange={e => setForm({ ...form, min_order: e.target.value })} data-testid="offer-form-min" /></div>
                <div><Label>Max discount (₹)</Label><Input type="number" value={form.max_discount || 0} onChange={e => setForm({ ...form, max_discount: e.target.value })} data-testid="offer-form-max" /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                <div>
                  <Label>Active</Label>
                  <div className="text-xs text-stone-500 mt-1">Toggle to activate or deactivate this offer.</div>
                </div>
                <button onClick={() => setForm({ ...form, active: !form.active })} data-testid="offer-form-active" className={`w-12 h-6 rounded-full transition-colors ${form.active ? "bg-orange-600" : "bg-stone-300"}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${form.active ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>
              <Button onClick={save} className="w-full rounded-full bg-stone-900 hover:bg-stone-800" data-testid="offer-form-save">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && <div className="mt-6"><ApiUnavailable message={error} onRetry={load} /></div>}

      <div className="mt-6 soft-panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">Code</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Value</th>
              <th className="text-left px-5 py-3">Min order</th>
              <th className="text-left px-5 py-3">Redemptions</th>
              <th className="text-left px-5 py-3">Status</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.code} className="border-t border-stone-100 hover:bg-stone-50/60" data-testid={`offer-row-${c.code}`}>
                <td className="px-5 py-3 font-mono text-sm font-semibold">{c.code}</td>
                <td className="px-5 py-3 capitalize">{c.discount_type}</td>
                <td className="px-5 py-3 font-semibold">{c.discount_type === "percent" ? `${c.value}%` : formatMoney(c.value, { noPaise: true })}</td>
                <td className="px-5 py-3">{c.min_order > 0 ? formatMoney(c.min_order, { noPaise: true }) : "Any"}</td>
                <td className="px-5 py-3">{c.redemptions || 0}</td>
                <td className="px-5 py-3">
                  <Badge className={`${c.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"} border-0 capitalize`}>{c.active ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)} className="rounded-full" data-testid={`edit-offer-${c.code}`}><Edit size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(c)} className="rounded-full" data-testid={`toggle-offer-${c.code}`}>{c.active ? "Deactivate" : "Activate"}</Button>
                  <Button variant="ghost" size="sm" onClick={() => del(c.code)} className="rounded-full text-red-600" data-testid={`del-offer-${c.code}`}><Trash2 size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-stone-500">No offers match this filter.</div>}
      </div>
    </div>
  );
}