import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function googleLogin() {
  const redirect = window.location.origin + "/menu";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
}

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
      <h1 className="font-display text-3xl font-bold tracking-tight">Create an account</h1>
      <p className="text-stone-500 text-sm mt-1">Join us for warm meals delivered fast.</p>

      <button onClick={googleLogin}
        className="mt-8 w-full h-11 rounded-full bg-white border border-stone-200 hover:bg-stone-50 flex items-center justify-center gap-2 font-medium text-sm"
        data-testid="google-signup-btn">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.2 3.62l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-6 text-xs text-stone-400">
        <div className="flex-1 h-px bg-stone-200" /> OR <div className="flex-1 h-px bg-stone-200" />
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl mt-1" data-testid="signup-name-input" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl mt-1" data-testid="signup-email-input" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl mt-1" data-testid="signup-password-input" />
        </div>
        <Button type="submit" disabled={loading}
          className="w-full h-11 rounded-full bg-[#E76F51] hover:bg-[#D85C3E]"
          data-testid="signup-submit-btn">
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-stone-500 mt-6 text-center">
        Already have an account? <Link to="/login" className="text-[#E76F51] font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
