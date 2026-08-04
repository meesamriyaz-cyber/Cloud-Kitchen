import React, { useEffect, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const empty = { name: "", description: "", price: 0, category_id: "", image_url: "", veg: true, spice_level: "medium", is_available: true };

export default function AdminMenu() {
  const [dishes, setDishes] = useState([]);
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [d, c] = await Promise.all([axios.get(`${API}/dishes`), axios.get(`${API}/categories`)]);
    setDishes(d.data); setCats(c.data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...empty, category_id: cats[0]?.id || "" }); setOpen(true); };
  const openEdit = (d) => { setEditing(d.id); setForm({ ...d }); setOpen(true); };

  const save = async () => {
    try {
      const payload = { ...form, price: Number(form.price) };
      if (editing) await axios.put(`${API}/dishes/${editing}`, payload);
      else await axios.post(`${API}/dishes`, payload);
      toast.success("Saved");
      setOpen(false);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this dish?")) return;
    await axios.delete(`${API}/dishes/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Menu Management</h1>
          <p className="text-stone-500 text-sm mt-1">{dishes.length} dishes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="rounded-full bg-[#E76F51] hover:bg-[#D85C3E]" data-testid="admin-add-dish-btn">
              <Plus size={16} className="mr-1" /> Add Dish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Dish" : "Add Dish"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} data-testid="dish-form-name" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} data-testid="dish-form-desc" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} data-testid="dish-form-price" /></div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                    <SelectTrigger data-testid="dish-form-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {cats.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Image URL</Label><Input value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} data-testid="dish-form-image" /></div>
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
              <Button onClick={save} className="w-full rounded-full bg-[#E76F51] hover:bg-[#D85C3E]" data-testid="dish-form-save">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-5 py-3">Dish</th>
              <th className="text-left px-5 py-3">Category</th>
              <th className="text-left px-5 py-3">Type</th>
              <th className="text-left px-5 py-3">Price</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dishes.map(d => (
              <tr key={d.id} className="border-t border-stone-100" data-testid={`admin-dish-row-${d.id}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {d.image_url && <img src={d.image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                    <div className="font-medium">{d.name}</div>
                  </div>
                </td>
                <td className="px-5 py-3 text-stone-600">{cats.find(c => c.id === d.category_id)?.name || "—"}</td>
                <td className="px-5 py-3">{d.veg ? "Veg" : "Non-veg"}</td>
                <td className="px-5 py-3">₹{d.price}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => openEdit(d)} className="text-stone-500 hover:text-stone-900 p-2" data-testid={`edit-dish-${d.id}`}><Pencil size={14} /></button>
                  <button onClick={() => del(d.id)} className="text-stone-500 hover:text-red-500 p-2" data-testid={`del-dish-${d.id}`}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
