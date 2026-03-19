"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type LeaderOption = { id: string; username: string };
type TeamOption = {
  id: string;
  name: string;
  leaderId: string | null;
  leader: { id: string; username: string } | null;
  members: { id: string; username: string }[];
};
type UserItem = {
  id: string;
  username: string;
  role: "admin" | "staff";
  isActive: boolean;
  teamId?: string | null;
  team?: { id: string; name: string; leaderId: string | null; leader: { id: string; username: string } | null } | null;
  recordCount?: number;
};
type EditModalState = {
  userId: string;
  username: string;
  password: string;
  teamId: string;
  targetStaffId: string;
};

type CurrentRole = "admin" | "staff";

type ApiError = { error?: string };

function getRoleLabel(user: UserItem) {
  if (user.role === "admin") return "Admin";
  if (user.team?.leaderId === user.id) return "Tổ trưởng";
  return "Nhân viên";
}

function CreateTeamCard({
  teamForm,
  leaders,
  onChange,
  onSubmit,
}: {
  teamForm: { name: string; leaderId: string };
  leaders: LeaderOption[];
  onChange: (patch: Partial<{ name: string; leaderId: string }>) => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="text-lg font-semibold">Tạo tổ</div>
      <Input placeholder="Tên tổ" value={teamForm.name} onChange={(e) => onChange({ name: e.target.value })} />
      <Select value={teamForm.leaderId} onChange={(e) => onChange({ leaderId: e.target.value })}>
        <option value="">Chưa chọn tổ trưởng</option>
        {leaders.map((leader) => (
          <option key={leader.id} value={leader.id}>{leader.username}</option>
        ))}
      </Select>
      <Button onClick={onSubmit}>Tạo tổ</Button>
    </Card>
  );
}

function CreateUserCard({
  userForm,
  teams,
  message,
  onChange,
  onSubmit,
}: {
  userForm: { username: string; password: string; teamId: string };
  teams: TeamOption[];
  message: string | null;
  onChange: (patch: Partial<{ username: string; password: string; teamId: string }>) => void;
  onSubmit: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="text-lg font-semibold">Tạo nhân viên</div>
      <div className="grid gap-3 md:grid-cols-3">
        <Input placeholder="Username" value={userForm.username} onChange={(e) => onChange({ username: e.target.value })} />
        <Input type="password" placeholder="Mật khẩu" value={userForm.password} onChange={(e) => onChange({ password: e.target.value })} />
        <Select value={userForm.teamId} onChange={(e) => onChange({ teamId: e.target.value })}>
          <option value="">Chọn tổ</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </Select>
      </div>
      <Button onClick={onSubmit}>Tạo user</Button>
      {message ? <div className="text-sm text-slate-500">{message}</div> : null}
    </Card>
  );
}

function TeamsSection({
  teams,
  leaders,
  currentRole,
  onUpdateTeam,
}: {
  teams: TeamOption[];
  leaders: LeaderOption[];
  currentRole: CurrentRole;
  onUpdateTeam: (teamId: string, payload: Record<string, unknown>, successMessage: string) => void;
}) {
  return (
    <Card className="mt-6 space-y-4">
      <div className="text-lg font-semibold">Danh sách tổ</div>
      <div className="space-y-3">
        {teams.map((team) => (
          <div key={team.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{team.name}</div>
                <div className="text-sm text-slate-500">
                  Tổ trưởng: {team.leader?.username || "Chưa gán"} · Nhân viên: {team.members.length}
                </div>
              </div>
              {currentRole === "admin" ? (
                <div className="flex gap-2">
                  <Input
                    className="w-48"
                    defaultValue={team.name}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value && value !== team.name) onUpdateTeam(team.id, { name: value }, "Đã đổi tên tổ");
                    }}
                  />
                  <Select value={team.leaderId || ""} onChange={(e) => onUpdateTeam(team.id, { leaderId: e.target.value || null }, "Đã cập nhật tổ trưởng")}>
                    <option value="">Chọn tổ trưởng</option>
                    {leaders.map((leader) => (
                      <option key={leader.id} value={leader.id}>{leader.username}</option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function UsersTable({ users, onEdit }: { users: UserItem[]; onEdit: (user: UserItem) => void }) {
  return (
    <Card className="mt-6">
      <div className="mb-4 text-lg font-semibold">Danh sách người dùng</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Vai trò</th>
              <th className="px-3 py-2">Tổ</th>
              <th className="px-3 py-2">Tổ trưởng</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2">Số data</th>
              <th className="px-3 py-2 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-slate-100">
                <td className="px-3 py-3">{user.username}</td>
                <td className="px-3 py-3">{getRoleLabel(user)}</td>
                <td className="px-3 py-3">{user.team?.name || "-"}</td>
                <td className="px-3 py-3">{user.team?.leader?.username || "-"}</td>
                <td className="px-3 py-3">{user.isActive ? "Đang hoạt động" : "Đã khóa"}</td>
                <td className="px-3 py-3">{user.role === "staff" ? user.recordCount || 0 : "-"}</td>
                <td className="px-3 py-3 text-right">
                  {user.role === "admin" ? null : (
                    <Button variant="secondary" onClick={() => onEdit(user)}>Edit</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function EditUserModal({
  user,
  state,
  teams,
  transferCandidates,
  onChange,
  onClose,
  onSaveUsername,
  onSavePassword,
  onChangeTeam,
  onTransfer,
  onToggleActive,
  onDelete,
}: {
  user: UserItem;
  state: EditModalState;
  teams: TeamOption[];
  transferCandidates: UserItem[];
  onChange: (patch: Partial<EditModalState>) => void;
  onClose: () => void;
  onSaveUsername: () => void;
  onSavePassword: () => void;
  onChangeTeam: () => void;
  onTransfer: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <Card className="w-full max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Edit: {user.username}</div>
            <div className="text-sm text-slate-500">{getRoleLabel(user)}</div>
          </div>
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="font-medium">Username</div>
            <Input value={state.username} onChange={(e) => onChange({ username: e.target.value })} />
            <Button onClick={onSaveUsername}>Lưu username</Button>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="font-medium">Mật khẩu</div>
            <Input type="password" value={state.password} onChange={(e) => onChange({ password: e.target.value })} />
            <Button onClick={onSavePassword}>Lưu mật khẩu</Button>
          </div>

          {user.role === "staff" ? (
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 md:col-span-2">
              <div className="font-medium">Chuyển tổ / chuyển data</div>
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={state.teamId} onChange={(e) => onChange({ teamId: e.target.value })}>
                  <option value="">Chọn tổ</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </Select>
                <Button onClick={onChangeTeam}>Chuyển tổ</Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={state.targetStaffId} onChange={(e) => onChange({ targetStaffId: e.target.value })}>
                  <option value="">Chọn nhân viên đích</option>
                  {transferCandidates.map((item) => (
                    <option key={item.id} value={item.id}>{item.username}</option>
                  ))}
                </Select>
                <Button onClick={onTransfer}>Chuyển data</Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-between border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={onToggleActive}>
            {user.isActive ? "Khóa user" : "Mở user"}
          </Button>
          <Button variant="danger" onClick={onDelete}>Xóa user</Button>
        </div>
      </Card>
    </div>
  );
}

export function UsersClient({
  initialUsers,
  initialTeams,
  leaders,
  currentRole,
  currentUserId,
}: {
  initialUsers: UserItem[];
  initialTeams: TeamOption[];
  leaders: LeaderOption[];
  currentRole: CurrentRole;
  currentUserId: string;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [teams, setTeams] = useState(initialTeams);
  const [leaderOptions, setLeaderOptions] = useState(leaders);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", leaderId: leaders[0]?.id || "" });
  const [userForm, setUserForm] = useState({ username: "", password: "", teamId: initialTeams[0]?.id || "" });
  const [editModal, setEditModal] = useState<EditModalState | null>(null);

  const visibleTeams = useMemo(
    () => (currentRole === "admin" ? teams : teams.filter((team) => team.leaderId === currentUserId)),
    [teams, currentRole, currentUserId],
  );

  const visibleLeaders = useMemo(
    () => (currentRole === "admin" ? leaderOptions : leaderOptions.filter((leader) => leader.id === currentUserId)),
    [leaderOptions, currentRole, currentUserId],
  );

  const editingUser = useMemo(
    () => users.find((item) => item.id === editModal?.userId) ?? null,
    [users, editModal?.userId],
  );

  const transferCandidates = useMemo(() => {
    if (!editingUser) return [];
    return users.filter((item) => {
      if (item.role !== "staff" || item.id === editingUser.id || !item.isActive) return false;
      if (currentRole === "admin") return true;
      return item.team?.leaderId === currentUserId;
    });
  }, [users, editingUser, currentRole, currentUserId]);

  function patchTeamForm(patch: Partial<typeof teamForm>) {
    setTeamForm((prev) => ({ ...prev, ...patch }));
  }

  function patchUserForm(patch: Partial<typeof userForm>) {
    setUserForm((prev) => ({ ...prev, ...patch }));
  }

  function patchEditModal(patch: Partial<EditModalState>) {
    setEditModal((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function readJson(response: Response) {
    return response.json().catch(() => ({} as ApiError));
  }

  async function createTeam() {
    const response = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamForm.name, leaderId: teamForm.leaderId || null }),
    });
    const data = await readJson(response);
    if (!response.ok) return setMessage(data.error || "Không tạo được tổ");

    setTeams((prev) => [data.item, ...prev]);
    setTeamForm({ name: "", leaderId: leaders[0]?.id || "" });
    setMessage("Đã tạo tổ");
  }

  async function updateTeam(teamId: string, payload: Record<string, unknown>, successMessage: string) {
    const response = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) return setMessage(data.error || "Không cập nhật được tổ");

    setTeams((prev) => prev.map((item) => (item.id === teamId ? data.item : item)));
    setUsers((prev) =>
      prev.map((item) =>
        item.teamId === teamId
          ? {
              ...item,
              team: {
                id: data.item.id,
                name: data.item.name,
                leaderId: data.item.leaderId,
                leader: data.item.leader,
              },
            }
          : item,
      ),
    );
    setMessage(successMessage);
  }

  async function createUser() {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: userForm.username,
        password: userForm.password,
        teamId: userForm.teamId || null,
      }),
    });
    const data = await readJson(response);
    if (!response.ok) return setMessage(data.error || "Không tạo được user");

    setUsers((prev) => [data.item, ...prev]);
    setUserForm({ username: "", password: "", teamId: visibleTeams[0]?.id || "" });
    setMessage("Đã tạo user");
  }

  async function updateUser(user: UserItem, payload: Record<string, unknown>, successMessage: string) {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    if (!response.ok) return setMessage(data.error || "Không cập nhật được user");

    setUsers((prev) => prev.map((item) => (item.id === user.id ? data.item : item)));
    setMessage(successMessage);
    return true;
  }

  async function toggleActive(user: UserItem) {
    const response = await fetch(`/api/users/${user.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (!response.ok) return;

    setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, isActive: !item.isActive } : item)));
    setMessage(user.isActive ? "Đã khóa user" : "Đã mở user");
  }

  async function transferRecords() {
    if (!editingUser || !editModal?.targetStaffId) return;
    const response = await fetch(`/api/users/${editingUser.id}/transfer-records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetStaffId: editModal.targetStaffId }),
    });
    const data = await readJson(response);
    if (!response.ok) return setMessage(data.error || "Không chuyển được dữ liệu");

    setUsers((prev) =>
      prev.map((item) =>
        item.id === editingUser.id
          ? { ...item, recordCount: 0 }
          : item.id === editModal.targetStaffId
            ? { ...item, recordCount: (item.recordCount || 0) + (data.movedCount || 0) }
            : item,
      ),
    );
    setMessage(`Đã chuyển ${data.movedCount || 0} dữ liệu`);
    setEditModal(null);
  }

  async function deleteUser(user: UserItem) {
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await readJson(response);
    if (!response.ok) return setMessage(data.error || "Không xóa được user");

    setUsers((prev) => prev.filter((item) => item.id !== user.id));
    setMessage("Đã xóa user");
    setEditModal(null);
  }

  function openEditModal(user: UserItem) {
    setEditModal({
      userId: user.id,
      username: user.username,
      password: "",
      teamId: user.teamId || visibleTeams[0]?.id || "",
      targetStaffId: "",
    });
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
        {currentRole === "admin" ? (
          <CreateTeamCard teamForm={teamForm} leaders={visibleLeaders} onChange={patchTeamForm} onSubmit={() => void createTeam()} />
        ) : null}

        <CreateUserCard userForm={userForm} teams={visibleTeams} message={message} onChange={patchUserForm} onSubmit={() => void createUser()} />
      </div>

      <TeamsSection teams={visibleTeams} leaders={visibleLeaders} currentRole={currentRole} onUpdateTeam={(...args) => void updateTeam(...args)} />
      <UsersTable users={users} onEdit={openEditModal} />

      {editModal && editingUser ? (
        <EditUserModal
          user={editingUser}
          state={editModal}
          teams={visibleTeams}
          transferCandidates={transferCandidates}
          onChange={patchEditModal}
          onClose={() => setEditModal(null)}
          onSaveUsername={() => void updateUser(editingUser, { username: editModal.username }, "Đã cập nhật username")}
          onSavePassword={() => void updateUser(editingUser, { password: editModal.password }, "Đã cập nhật mật khẩu")}
          onChangeTeam={() => void updateUser(editingUser, { teamId: editModal.teamId || null }, "Đã cập nhật tổ cho nhân viên")}
          onTransfer={() => void transferRecords()}
          onToggleActive={() => void toggleActive(editingUser)}
          onDelete={() => void deleteUser(editingUser)}
        />
      ) : null}
    </>
  );
}
