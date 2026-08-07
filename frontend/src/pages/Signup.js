import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(name, email, password);
      toast.success(`Welcome, ${u.name}!`);
      navigate("/menu");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-14">
      <div className="soft-panel p-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Create an account</h1>
        <p className="text-stone-500 text-sm mt-1">Join us for warm meals delivered fast.</p>

        <form onSubmit={submit} className="space-y-4 mt-8">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-xl mt-1 bg-white" data-testid="signup-name-input" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl mt-1 bg-white" data-testid="signup-email-input" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl mt-1 bg-white" data-testid="signup-password-input" />
          </div>
        <Button type="submit" disabled={loading}
          className="w-full h-11 rounded-full bg-orange-600 hover:bg-orange-700"
          data-testid="signup-submit-btn">
          {loading ? "Creating..." : "Create account"}
        </Button>
        </form>

        <p className="text-sm text-stone-500 mt-6 text-center">
          Already have an account? <Link to="/login" className="text-emerald-700 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
