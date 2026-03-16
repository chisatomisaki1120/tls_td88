"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type UserItem = {
  id: string;
  username: string;
  role: "admin" | "leader" | "staff";
  isActive: boolean;
};

export function UsersClient({ initialUsers }: { initialUsers: UserItem[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ username: "", password: "", role: "staff" });
  const [message, setMessage] = useState<string | null>(null);

  async function createUser() {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Không tạo được user");
      return;
    }
    setUsers((prev) => [data.item, ...prev]);
    setMessage("Đã tạo user");
    setForm({ username: "", password: "", role: "staff" });
  }

  async function toggleActive(user: UserItem) {
    const response = await fetch(`/api/users/${user.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (!response.ok) return;
    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, isActive: !item.isActive } : item)));
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="text-lg font-semibold">Tạo leader / staff</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input placeholder="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "leader" | "staff" })}>
            <option value="staff">Staff</option>
            <option value="leader">Leader</option>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={createUser}>Tạo user</Button>
          {message ? <span className="text-sm text-slate-500">{message}</span> : null}
        </div>
      </Card>

      <Card>
        <div className="mb-4 text-lg font-semibold">Danh sách người dùng</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Vai trò</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">{user.username}</td>
                  <td className="px-3 py-3 uppercase">{user.role}</td>
                  <td className="px-3 py-3">{user.isActive ? "Đang hoạt động" : "Đã khóa"}</td>
                  <td className="px-3 py-3 text-right">
                    {user.role === "admin" ? null : (
                      <Button variant="secondary" onClick={() => toggleActive(user)}>
                        {user.isActive ? "Khóa" : "Mở"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
