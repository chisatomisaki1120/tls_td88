"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Đăng nhập thất bại");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md space-y-6 p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Đăng nhập</h1>
        <p className="text-sm text-slate-500">Dùng tài khoản nội bộ để vào dashboard.</p>
      </div>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tên đăng nhập</label>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Mật khẩu</label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
        </div>
        {error ? <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </Card>
  );
}
