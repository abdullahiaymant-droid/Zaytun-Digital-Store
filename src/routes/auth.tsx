import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Zaytun Digital Tech Store" },
      { name: "description", content: "Sign in or create your Zaytun Digital Tech Store account." },
      { property: "og:title", content: "Sign in — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Access your orders and wishlist." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("Check your email for a password reset link.");
        return;
      }
      const parsed = schema.safeParse({ email, password });
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        setSent("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/account" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) return toast.error("Google sign-in failed");
    if (r.redirected) return;
    nav({ to: "/account" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold">{mode === "up" ? "Create account" : mode === "forgot" ? "Reset password" : "Welcome back"}</h1>
        {sent ? (
          <p className="mt-4 rounded-lg bg-secondary p-3 text-sm">{sent}</p>
        ) : (
          <>
            {mode !== "forgot" && (
              <>
                <button onClick={google} className="mt-6 w-full rounded-lg border bg-background py-2.5 font-medium">Continue with Google</button>
                <div className="my-4 text-center text-xs text-muted-foreground">or</div>
              </>
            )}
            <form onSubmit={submit} className="space-y-3">
              {mode === "up" && <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border bg-background px-3 py-2.5" />}
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border bg-background px-3 py-2.5" />
              {mode !== "forgot" && <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-lg border bg-background px-3 py-2.5" />}
              <button disabled={busy} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
                {busy ? "Please wait…" : mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </button>
            </form>
          </>
        )}
        <div className="mt-4 flex justify-between text-sm">
          <button className="text-primary" onClick={() => { setSent(""); setMode(mode === "up" ? "in" : "up"); }}>
            {mode === "up" ? "Have an account? Sign in" : "New here? Create account"}
          </button>
          {mode === "in" && <button className="text-muted-foreground" onClick={() => setMode("forgot")}>Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}
