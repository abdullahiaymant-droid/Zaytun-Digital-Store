import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Zaytun Digital Tech Store" },
      { name: "description", content: "Choose a new password for your account." },
      { property: "og:title", content: "Reset password — Zaytun Digital Tech Store" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const nav = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("At least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    nav({ to: "/account" });
  };
  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-3 px-4 py-14">
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" className="w-full rounded-lg border bg-card px-3 py-2.5" />
      <button className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground">Update password</button>
    </form>
  );
}
