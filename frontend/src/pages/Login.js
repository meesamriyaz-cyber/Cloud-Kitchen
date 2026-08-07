import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-stone-500 text-sm mt-1">Sign in to order your favourites.</p>

        <form onSubmit={submit} className="space-y-4 mt-8">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl mt-1 bg-white" data-testid="login-email-input" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl mt-1 bg-white" data-testid="login-password-input" />
          </div>
        <Button type="submit" disabled={loading}
          className="w-full h-11 rounded-full bg-orange-600 hover:bg-orange-700"
          data-testid="login-submit-btn">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
        </form>

        <p className="text-sm text-stone-500 mt-6 text-center">
          No account? <Link to="/signup" className="text-emerald-700 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
