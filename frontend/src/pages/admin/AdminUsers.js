import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Pencil, RefreshCcw, Search, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ApiUnavailable from "@/components/ApiUnavailable";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const empty = { name: "", email: "", password: "", role: "customer" };

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    setRefreshing(true);
    try {
      const res = await axios.get(`${API}/admin/users`);
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to load users.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (term && !`${u.name} ${u.email}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [roleFilter, users, q]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u.user_id);
    setForm({ name: u.name, email: u.email, role: u.role, password: "" });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (!form.name || !form.email || !form.role) {
        toast.error("Name, email, and role are required");
        return;
      }
      const payload = { name: form.name, email: form.email, role: form.role };
      if (form.password) payload.password = form.password;
      if (editing) await axios.put(`${API}/admin/users/${editing}`, payload);
      else await axios.post(`${API}/admin/users`, payload);
      toast.success(editing ? "User updated" : "User created");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save user");
    }
  };

  const del = async (user) => {
    if (!window.confirm(`Delete user ${user.email}?`)) return;
    try {
      await axios.delete(`${API}/admin/users/${user.user_id}`);
      toast.success("User deleted");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete user");
    }
  };

  const roleBadge = (role) => {
    const map = {
      admin: "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary/90",
      staff: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
      salesman: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
      customer: "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300",
    };
    return map[role] || "bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300";
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-300">
            <UserCog size={13} /> Accounts
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-4">User Management</h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Create, update, and manage roles for admin, staff, salesman, and customer accounts.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="rounded-full bg-primary hover:opacity-95" data-testid="admin-add-user-btn">
              <Plus size={16} className="mr-1" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-stone-700 dark:text-stone-300">Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" data-testid="user-form-name" /></div>
              <div><Label className="text-stone-700 dark:text-stone-300">Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" data-testid="user-form-email" /></div>
              <div><Label className="text-stone-700 dark:text-stone-300">Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger className="mt-1 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid="user-form-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="salesman">Salesman</SelectItem>
                    <SelectItem value="chef">Chef</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-stone-700 dark:text-stone-300">Password {editing && <span className="text-stone-400 font-normal">(leave blank to keep current)</span>}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="mt-1 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" data-testid="user-form-password" /></div>
              <Button onClick={save} className="w-full rounded-full bg-primary hover:opacity-95" data-testid="user-form-save">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Total users", users.length],
          ["Admins", users.filter(u => u.role === "admin").length],
          ["Salesmen", users.filter(u => u.role === "salesman").length],
          ["Customers", users.filter(u => u.role === "customer").length],
        ].map(([label, value]) => (
          <div key={label} className="soft-panel p-4">
             <div className="text-2xl font-bold font-display dark:text-stone-200">{value}</div>
             <div className="text-xs text-stone-500 dark:text-stone-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {error && <div className="mt-6"><ApiUnavailable message={error} onRetry={load} /></div>}

      <div className="mt-6 soft-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px]">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input value={q} onChange={event => setQ(event.target.value)} placeholder="Search name or email" className="pl-10 h-11 rounded-full bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid="admin-users-search" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="rounded-full h-11 bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200" data-testid="admin-users-role-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="salesman">Salesman</SelectItem>
              <SelectItem value="chef">Chef</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 soft-panel overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">User</th>
              <th className="text-left px-5 py-3">Email</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Provider</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.user_id} className="border-t border-stone-100 dark:border-stone-700 hover:bg-stone-50/60 dark:hover:bg-stone-800/40" data-testid={`admin-user-row-${u.user_id}`}>
                <td className="px-5 py-3 font-semibold dark:text-stone-200">{u.name}</td>
                <td className="px-5 py-3 text-stone-600 dark:text-stone-400">{u.email}</td>
                <td className="px-5 py-3"><Badge className={`${roleBadge(u.role)} border-0 capitalize`}>{u.role}</Badge></td>
                <td className="px-5 py-3 text-stone-600 dark:text-stone-400 capitalize">{u.provider || 'local'}</td>
                <td className="px-5 py-3 text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="rounded-full text-stone-600 dark:text-stone-300" data-testid={`edit-user-${u.user_id}`}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="sm" onClick={() => del(u)} className="rounded-full text-red-600" data-testid={`del-user-${u.user_id}`}><Trash2 size={14} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="py-12 text-center text-stone-500 dark:text-stone-400">No users match this filter.</div>}
      </div>
    </div>
  );
}
