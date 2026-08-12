import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name}!`);
      navigate(u.role === "admin" ? "/admin" : "/menu");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-14">
      <div className="soft-panel p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center">
            <ChefHat size={20} />
          </div>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">Sign in to order your favourites.</p>

        <form onSubmit={submit} className="space-y-4 mt-8">
          <div>
            <Label htmlFor="email" className="text-stone-700 dark:text-stone-300">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl mt-1 bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" data-testid="login-email-input" />
          </div>
          <div>
            <Label htmlFor="password" className="text-stone-700 dark:text-stone-300">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl mt-1 bg-white dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100" data-testid="login-password-input" />
          </div>
        <Button type="submit" disabled={loading}
          className="w-full h-11 rounded-full bg-primary hover:opacity-95"
          data-testid="login-submit-btn">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        </form>

        <p className="text-sm text-stone-500 dark:text-stone-400 mt-6 text-center">
          No account? <Link to="/signup" className="text-emerald-700 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
