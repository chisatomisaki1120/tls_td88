"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type UserItem = {
  id: string;
  username: string;
  role: "admin" | "leader" | "staff";
  isActive: boolean;
  teamLeaderId?: string | null;
  teamLeader?: { id: string; username: string } | null;
};

type LeaderOption = { id: string; username: string };

export function UsersClient({
  initialUsers,
  leaders,
  currentRole,
  currentUserId,
}: {
  initialUsers: UserItem[];
  leaders: LeaderOption[];
  currentRole: "admin" | "leader" | "staff";
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: currentRole === "leader" ? "staff" : "staff",
    teamLeaderId: currentRole === "leader" ? currentUserId : leaders[0]?.id || "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const visibleLeaders = useMemo(
    () => (currentRole === "leader" ? leaders.filter((leader) => leader.id === currentUserId) : leaders),
    [currentRole, currentUserId, leaders],
  );

  async function createUser() {
    const payload = {
      username: form.username,
      password: form.password,
      role: currentRole === "leader" ? "staff" : form.role,
      teamLeaderId:
        currentRole === "leader"
          ? currentUserId
          : form.role === "staff"
            ? form.teamLeaderId || null
            : null,
    };

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Không tạo được user");
      return;
    }
    setUsers((prev) => [data.item, ...prev]);
    setMessage("Đã tạo user");
    setForm({
      username: "",
      password: "",
      role: currentRole === "leader" ? "staff" : "staff",
      teamLeaderId: currentRole === "leader" ? currentUserId : leaders[0]?.id || "",
    });
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

  async function updateUser(user: UserItem, payload: Record<string, unknown>, successMessage: string) {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "Không cập nhật được user");
      return;
    }

    setUsers((prev) => prev.map((item) => (item.id === user.id ? data.item : item)));
    setMessage(successMessage);
  }

  async function updateTeamLeader(user: UserItem, nextTeamLeaderId: string) {
    await updateUser(user, { teamLeaderId: nextTeamLeaderId || null }, "Đã cập nhật team");
  }

  async function editUser(user: UserItem) {
    const nextUsername = window.prompt("Username mới", user.username)?.trim();
    if (!nextUsername || nextUsername === user.username) return;
    await updateUser(user, { username: nextUsername }, "Đã cập nhật username");
  }

  async function resetPassword(user: UserItem) {
    const nextPassword = window.prompt(`Mật khẩu mới cho ${user.username}`)?.trim();
    if (!nextPassword) return;
    if (nextPassword.length < 6) {
      setMessage("Mật khẩu phải từ 6 ký tự");
      return;
    }

    await updateUser(user, { password: nextPassword }, "Đã cập nhật mật khẩu");
  }

  async function deleteUser(user: UserItem) {
    const confirmed = window.confirm(`Xóa user ${user.username}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data.error || "Không xóa được user");
      return;
    }

    setUsers((prev) => prev.filter((item) => item.id !== user.id));
    setMessage("Đã xóa user");
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="text-lg font-semibold">{currentRole === "leader" ? "Thêm staff vào team" : "Tạo leader / staff"}</div>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input placeholder="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {currentRole === "admin" ? (
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "leader" | "staff" })}>
              <option value="staff">Staff</option>
              <option value="leader">Leader</option>
            </Select>
          ) : (
            <Input value="staff" readOnly />
          )}
          <Select
            disabled={currentRole === "leader" || form.role !== "staff"}
            value={currentRole === "leader" ? currentUserId : form.teamLeaderId}
            onChange={(e) => setForm({ ...form, teamLeaderId: e.target.value })}
          >
            <option value="">Chọn leader cho staff</option>
            {visibleLeaders.map((leader) => (
              <option key={leader.id} value={leader.id}>{leader.username}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={createUser}>{currentRole === "leader" ? "Thêm staff" : "Tạo user"}</Button>
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
                <th className="px-3 py-2">Leader quản lý</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">{user.username}</td>
                  <td className="px-3 py-3 uppercase">{user.role}</td>
                  <td className="px-3 py-3">
                    {currentRole === "admin" && user.role === "staff" ? (
                      <Select value={user.teamLeaderId || ""} onChange={(e) => void updateTeamLeader(user, e.target.value)}>
                        <option value="">Chọn leader</option>
                        {leaders.map((leader) => (
                          <option key={leader.id} value={leader.id}>{leader.username}</option>
                        ))}
                      </Select>
                    ) : (
                      user.teamLeader?.username || (user.role === "staff" ? "Chưa gán leader" : "-")
                    )}
                  </td>
                  <td className="px-3 py-3">{user.isActive ? "Đang hoạt động" : "Đã khóa"}</td>
                  <td className="px-3 py-3 text-right">
                    {user.role === "admin" || (currentRole === "leader" && user.role !== "staff") ? null : (
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => editUser(user)}>
                          Sửa
                        </Button>
                        <Button variant="secondary" onClick={() => resetPassword(user)}>
                          Đổi MK
                        </Button>
                        <Button variant="secondary" onClick={() => toggleActive(user)}>
                          {user.isActive ? "Khóa" : "Mở"}
                        </Button>
                        <Button variant="danger" onClick={() => deleteUser(user)}>
                          Xóa
                        </Button>
                      </div>
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
