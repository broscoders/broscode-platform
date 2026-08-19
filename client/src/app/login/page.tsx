"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Brand side */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface p-10 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,152,255,0.15),transparent_45%)]" />
        <div className="relative flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg">
            <Image src="/logo.jpg" alt="Bro's Code" fill className="object-cover" />
          </div>
          <span className="font-display text-lg font-semibold">Bro&apos;s Code</span>
        </div>
        <div className="relative">
          <p className="font-display text-3xl font-semibold leading-tight tracking-tight">
            One dashboard.
            <br />
            Every deal, tracked.
          </p>
          <p className="mt-3 max-w-sm text-sm text-text-muted">
            Lead generation, outreach, CRM, sales, projects and revenue — run the whole business from
            a single command center.
          </p>
        </div>
        <p className="relative font-data text-xs text-text-muted">{"<"} We code your ideas {"/>"}</p>
      </div>

      {/* Form side */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg">
              <Image src="/logo.jpg" alt="Bro's Code" fill className="object-cover" />
            </div>
            <span className="font-display text-lg font-semibold">Bro&apos;s Code</span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-text-muted">Sign in to your admin dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Email</label>
              <Input
                type="email"
                required
                placeholder="admin@broscode.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted">Password</label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
