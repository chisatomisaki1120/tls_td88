"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

type UserOption = { id: string; username: string; role: "admin" | "leader" | "staff" };
type RecordItem = {
  id: string;
  phoneLast9: string;
  phoneRaw: string;
  statusText: string | null;
  noteText: string | null;
  updatedAt: string;
  assignedStaffId: string | null;
  leaderId: string | null;
  assignedStaff: UserOption | null;
  leader: UserOption | null;
};

export function PhoneRecordsClient({
  initialRecords,
  staffOptions,
  canAssign,
}: {
  initialRecords: RecordItem[];
  staffOptions: UserOption[];
  canAssign: boolean;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedId, setSelectedId] = useState<string | null>(initialRecords[0]?.id ?? null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return records.filter((item) => {
      const matchQ = !q || item.phoneLast9.includes(q);
      const matchStatus = !status || item.statusText === status;
      const matchStaff = !assignedStaffId || item.assignedStaffId === assignedStaffId;
      return matchQ && matchStatus && matchStaff;
    });
  }, [records, q, status, assignedStaffId]);

  const selected = records.find((item) => item.id === selectedId) ?? null;
  const statusOptions = Array.from(new Set(records.map((item) => item.statusText).filter(Boolean))) as string[];

  async function saveDetail() {
    if (!selected) return;
    const response = await fetch(`/api/phone-records/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusText: selected.statusText, noteText: selected.noteText }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Không thể lưu");
      return;
    }
    setRecords((prev) => prev.map((item) => (item.id === selected.id ? data.item : item)));
    setMessage("Đã lưu thay đổi");
  }

  async function assignStaff() {
    if (!selected) return;
    const response = await fetch(`/api/phone-records/${selected.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedStaffId: selected.assignedStaffId || null }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Không thể phân công");
      return;
    }
    setRecords((prev) => prev.map((item) => (item.id === selected.id ? data.item : item)));
    setMessage("Đã cập nhật phân công");
  }

  async function copyText(value: string | null | undefined) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setMessage("Đã copy");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Tìm 9 số cuối" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả status</option>
            {statusOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
          <Select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
            <option value="">Tất cả nhân viên</option>
            {staffOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.username}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => { setQ(""); setStatus(""); setAssignedStaffId(""); }}>Xóa bộ lọc</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2">Số điện thoại</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Nhân viên</th>
                <th className="px-3 py-2">Ghi chú</th>
                <th className="px-3 py-2">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50" onClick={() => setSelectedId(item.id)}>
                  <td className="px-3 py-3 font-mono font-semibold">{item.phoneLast9}</td>
                  <td className="px-3 py-3"><Badge>{item.statusText || "Chưa có"}</Badge></td>
                  <td className="px-3 py-3">{item.assignedStaff?.username || "Chưa gán"}</td>
                  <td className="max-w-[240px] truncate px-3 py-3 text-slate-600">{item.noteText || "-"}</td>
                  <td className="px-3 py-3 text-slate-500">{formatDateTime(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">Không có dữ liệu phù hợp.</div> : null}
        </div>
      </Card>

      <Card className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
        <div>
          <div className="text-lg font-semibold">Chi tiết record</div>
          <div className="text-sm text-slate-500">Sửa status, ghi chú và phân công.</div>
        </div>
        {selected ? (
          <>
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Số điện thoại</div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 font-mono font-semibold">
                <span>{selected.phoneLast9}</span>
                <Button variant="ghost" onClick={() => copyText(selected.phoneLast9)}>Copy</Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Input value={selected.statusText || ""} onChange={(e) => setRecords((prev) => prev.map((item) => item.id === selected.id ? { ...item, statusText: e.target.value } : item))} />
              <Button variant="ghost" onClick={() => copyText(selected.statusText)}>Copy status</Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ghi chú</label>
              <Textarea value={selected.noteText || ""} onChange={(e) => setRecords((prev) => prev.map((item) => item.id === selected.id ? { ...item, noteText: e.target.value } : item))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nhân viên phụ trách</label>
              <Select disabled={!canAssign} value={selected.assignedStaffId || ""} onChange={(e) => setRecords((prev) => prev.map((item) => item.id === selected.id ? { ...item, assignedStaffId: e.target.value || null, assignedStaff: staffOptions.find((staff) => staff.id === e.target.value) || null } : item))}>
                <option value="">Chưa gán</option>
                {staffOptions.map((item) => (
                  <option key={item.id} value={item.id}>{item.username}</option>
                ))}
              </Select>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <div>Số gốc: {selected.phoneRaw}</div>
              <div>Leader: {selected.leader?.username || "-"}</div>
              <div>Cập nhật: {formatDateTime(selected.updatedAt)}</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={saveDetail}>Lưu thay đổi</Button>
              {canAssign ? <Button variant="secondary" onClick={assignStaff}>Cập nhật phân công</Button> : null}
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-500">Chọn một record để xem chi tiết.</div>
        )}
        {message ? <div className="text-sm text-slate-500">{message}</div> : null}
      </Card>
    </div>
  );
}
