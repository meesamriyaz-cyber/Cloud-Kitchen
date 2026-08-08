import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, Pencil, Plus, RefreshCcw, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";
import ApiUnavailable from "@/components/ApiUnavailable";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const empty = { name: "", description: "", price: 0, category_id: "", image_url: "", veg: true, spice_level: "medium", is_available: true };

export default function AdminMenu() {
  const [dishes, setDishes] = useState([]);
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const load = useCallback(async () => {
    setError("");
    setRefreshing(true);
    try {
      const [d, c] = await Promise.all([axios.get(`${API}/dishes`), axios.get(`${API}/categories`)]);
      setDishes(d.data);
      setCats(c.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load menu management data.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return dishes.filter(dish => {
      if (catFilter !== "all" && dish.category_id !== catFilter) return false;
      if (availability === "available" && dish.is_available === false) return false;
      if (availability === "sold_out" && dish.is_available !== false) return false;
      if (term && !`${dish.name} ${dish.description || ""}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [availability, catFilter, dishes, q]);

  const stats = useMemo(() => ({
    dishes: dishes.length,
    available: dishes.filter(d => d.is_available !== false).length,
    soldOut: dishes.filter(d => d.is_available === false).length,
    categories: cats.length,
  }), [cats.length, dishes]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, category_id: cats[0]?.id || "" });
    setImagePreview("");
    setOpen(true);
  };

  const handleCategoryChange = (value) => {
    setForm({ ...form, category_id: value });
  };

  const openEdit = (d) => {
    setEditing(d.id);
    setForm({ ...d });
    setImagePreview(d.image_url || "");
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = { ...form, price: Number(form.price) };
      const missing = [];
      if (!payload.name || !payload.name.trim()) missing.push('name');
      if (!payload.category_id) missing.push('category');
      if (!Number.isFinite(payload.price) || Number(payload.price) < 0) missing.push('price');
      if (missing.length) {
        toast.error(`Please fill: ${missing.join(', ')}`);
        return;
      }
      if (editing) await axios.put(`${API}/dishes/${editing}`, payload);
      else await axios.post(`${API}/dishes`, payload);
      toast.success("Saved");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axios.post(`${API}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm(f => ({ ...f, image_url: res.data.url }));
      setImagePreview(res.data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggleAvailable = async (dish) => {
    try {
      await axios.put(`${API}/dishes/${dish.id}`, { ...dish, is_available: dish.is_available === false });
      toast.success(dish.is_available === false ? "Marked available" : "Marked sold out");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update availability");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this dish?")) return;
    try {
      await axios.delete(`${API}/dishes/${id}`);
      toast.success("Deleted");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-600">
            <ImageIcon size={13} /> Menu catalog
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">Menu Management</h1>
          <p className="text-stone-500 text-sm mt-1">Control pricing, photos, spice, and availability for online ordering and POS.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="rounded-full bg-stone-900 hover:bg-stone-800" data-testid="admin-add-dish-btn">
              <Plus size={16} className="mr-1" /> Add Dish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit Dish" : "Add Dish"}</DialogTitle></DialogHeader>
            <div className="grid md:grid-cols-[1fr_180px] gap-4">
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="dish-form-name" /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} data-testid="dish-form-desc" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Price (Rs.)</Label><Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} data-testid="dish-form-price" /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category_id} onValueChange={handleCategoryChange}>
                      <SelectTrigger data-testid="dish-form-category"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Image</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="dish-image-upload" data-testid="dish-image-input" />
                      <Button type="button" variant="outline" className="rounded-full bg-white" onClick={() => document.getElementById('dish-image-upload')?.click()} disabled={uploading}>
                        <Upload size={15} className="mr-2" /> {uploading ? 'Uploading...' : 'Upload Image'}
                      </Button>
                      {form.image_url && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setForm({...form, image_url: ""}); setImagePreview(""); }}>Clear</Button>
                      )}
                    </div>
                    <Input value={form.image_url} onChange={e => { setForm({...form, image_url: e.target.value}); setImagePreview(e.target.value); }} placeholder="Or paste image URL here" data-testid="dish-form-image" />
                    <div className="text-[11px] text-stone-500">Upload an image or paste a URL. Uploaded images are stored on Cloudinary CDN.</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={form.veg ? "veg" : "nonveg"} onValueChange={v => setForm({...form, veg: v === "veg"})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Vegetarian</SelectItem>
                        <SelectItem value="nonveg">Non-veg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Spice</Label>
                    <Select value={form.spice_level} onValueChange={v => setForm({...form, spice_level: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hot">Hot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                  <div>
                    <Label>Available for ordering</Label>
                    <div className="text-xs text-stone-500 mt-1">Turn off when an item is sold out.</div>
                  </div>
                  <Switch checked={Boolean(form.is_available)} onCheckedChange={v => setForm({...form, is_available: v})} data-testid="dish-form-available" />
                </div>
                <Button onClick={save} className="w-full rounded-full bg-stone-900 hover:bg-stone-800" data-testid="dish-form-save">Save</Button>
              </div>
              <div className="hidden md:block">
                <div className="aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                  {imagePreview ? <img src={imagePreview} alt="" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-stone-400"><ImageIcon /></div>}
                </div>
                <div className="text-xs text-stone-500 mt-2">Preview uses the public image URL exactly as customers will see it.</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Dishes", stats.dishes],
          ["Available", stats.available],
          ["Sold out", stats.soldOut],
          ["Categories", stats.categories],
        ].map(([label, value]) => (
          <div key={label} className="soft-panel p-4">
            <div className="text-2xl font-bold font-display">{value}</div>
            <div className="text-xs text-stone-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {error && <div className="mt-6"><ApiUnavailable message={error} onRetry={load} /></div>}

      <div className="mt-6 soft-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={event => setQ(event.target.value)} placeholder="Search dish or description" className="pl-10 h-11 rounded-full bg-white" data-testid="admin-menu-search" />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="rounded-full h-11 bg-white" data-testid="admin-menu-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger className="rounded-full h-11 bg-white" data-testid="admin-menu-availability-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="sold_out">Sold out</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-full bg-white h-11" onClick={load} disabled={refreshing}>
            <RefreshCcw size={15} className={refreshing ? "mr-2 animate-spin" : "mr-2"} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 soft-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3">Dish</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Price</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-t border-stone-100 hover:bg-stone-50/60" data-testid={`admin-dish-row-${d.id}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {d.image_url ? <img src={d.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400"><ImageIcon size={16} /></div>}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{d.name}</div>
                        <div className="text-xs text-stone-500 truncate max-w-sm">{d.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-stone-600">{cats.find(c => c.id === d.category_id)?.name || "-"}</td>
                  <td className="px-5 py-3">{d.veg ? "Veg" : "Non-veg"}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggleAvailable(d)} className="text-left" data-testid={`toggle-dish-available-${d.id}`}>
                      <Badge className={`${d.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} border-0`}>
                        {d.is_available ? "Available" : "Sold out"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-5 py-3 font-semibold">{formatMoney(d.price, { noPaise: true })}</td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => openEdit(d)} className="text-stone-500 hover:text-stone-900 p-2" data-testid={`edit-dish-${d.id}`}><Pencil size={14} /></button>
                    <button onClick={() => del(d.id)} className="text-stone-500 hover:text-red-500 p-2" data-testid={`del-dish-${d.id}`}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-stone-500">No menu items match this filter.</div>}
        </div>
      </div>
    </div>
  );
}
