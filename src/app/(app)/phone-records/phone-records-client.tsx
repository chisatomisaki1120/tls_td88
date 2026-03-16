"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type UserOption = { id: string; username: string; role: "admin" | "staff" };
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

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const DEFAULT_STATUS_SUGGESTIONS = [
  "Không nghe máy",
  "Không liên lạc được",
  "Không có nhu cầu",
  "Số không đúng",
  "Không đổ chuông",
  "Thuê bao đang tạm khóa liên lạc",
  "Không chơi nữa",
  "Số máy gọi đang tạm khóa",
  "Nghe máy không nói gì",
  "Không rảnh",
  "Khách muốn chơi",
];

function normalizeSuggestion(value: string) {
  return value.trim().toLowerCase();
}

const RecordRow = memo(function RecordRow({
  item,
  canAssign,
  staffOptions,
  suggestions,
  onStatusChange,
  onAssign,
  onCopy,
}: {
  item: RecordItem;
  canAssign: boolean;
  staffOptions: UserOption[];
  suggestions: string[];
  onStatusChange: (id: string, value: string) => void;
  onAssign: (id: string, nextAssignedStaffId: string | null) => void;
  onCopy: (value: string | null | undefined) => void;
}) {
  const currentValue = item.statusText || "";
  const filteredSuggestions = useMemo(() => {
    const keyword = normalizeSuggestion(currentValue);
    const ranked = suggestions
      .filter((suggestion) => !keyword || normalizeSuggestion(suggestion).includes(keyword))
      .sort((a, b) => {
        const aStarts = normalizeSuggestion(a).startsWith(keyword);
        const bStarts = normalizeSuggestion(b).startsWith(keyword);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        return a.length - b.length;
      });
    return ranked.slice(0, 8);
  }, [currentValue, suggestions]);

  const datalistId = `status-suggestions-${item.id}`;

  return (
    <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 md:grid-cols-[1.1fr_1.1fr_auto] md:items-start">
      <div className="space-y-2">
        <div className="relative">
          <Input value={item.phoneRaw} readOnly className="bg-white pr-16 font-medium" />
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-700"
            onClick={() => onCopy(item.phoneLast9)}
          >
            Copy
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Input
            list={datalistId}
            value={currentValue}
            onChange={(e) => onStatusChange(item.id, e.target.value)}
            placeholder="Nhập ghi chú / status"
            className="bg-white pr-16"
          />
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-blue-600 hover:text-blue-700"
            onClick={() => onCopy(item.statusText)}
          >
            Copy
          </button>
        </div>
        <datalist id={datalistId}>
          {filteredSuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2 md:w-52">
        {canAssign ? (
          <Select
            value={item.assignedStaffId || ""}
            onChange={(e) => onAssign(item.id, e.target.value || null)}
          >
            <option value="">Chưa gán</option>
            {staffOptions.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.username}</option>
            ))}
          </Select>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            {item.assignedStaff?.username || "Chưa gán"}
          </div>
        )}
      </div>
    </div>
  );
});

export function PhoneRecordsClient({
  initialRecords,
  staffOptions,
  canAssign,
  initialFilters,
  pagination,
}: {
  initialRecords: RecordItem[];
  staffOptions: UserOption[];
  canAssign: boolean;
  initialFilters: { q: string; status: string; assignedStaffId: string };
  pagination: Pagination;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [records, setRecords] = useState(initialRecords);
  const [q, setQ] = useState(initialFilters.q);
  const [status, setStatus] = useState(initialFilters.status);
  const [assignedStaffId, setAssignedStaffId] = useState(initialFilters.assignedStaffId);
  const [message, setMessage] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(String(pagination.page));
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastSavedSnapshotRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setRecords(initialRecords);
  }, [initialRecords]);

  useEffect(() => {
    setPageInput(String(pagination.page));
  }, [pagination.page]);

  const autocompleteSuggestions = useMemo(() => {
    const dynamic = records
      .map((item) => item.statusText?.trim())
      .filter(Boolean) as string[];

    const unique = new Map<string, string>();
    for (const suggestion of [...DEFAULT_STATUS_SUGGESTIONS, ...dynamic]) {
      const key = normalizeSuggestion(suggestion);
      if (!key) continue;
      if (!unique.has(key)) unique.set(key, suggestion.trim());
    }

    return Array.from(unique.values());
  }, [records]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  function updateUrl(next: { q?: string; status?: string; assignedStaffId?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());

    if (typeof next.q !== "undefined") {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (typeof next.status !== "undefined") {
      if (next.status) params.set("status", next.status);
      else params.delete("status");
    }
    if (typeof next.assignedStaffId !== "undefined") {
      if (next.assignedStaffId) params.set("assignedStaffId", next.assignedStaffId);
      else params.delete("assignedStaffId");
    }
    if (typeof next.page !== "undefined") {
      if (next.page > 1) params.set("page", String(next.page));
      else params.delete("page");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  async function persistRecord(recordId: string, statusText: string | null, noteText: string | null) {
    const response = await fetch(`/api/phone-records/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusText, noteText }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setMessage(data?.error || "Không thể lưu tự động");
      return;
    }

    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              ...data.item,
              updatedAt: data.item.updatedAt ?? record.updatedAt,
            }
          : record,
      ),
    );

    lastSavedSnapshotRef.current[recordId] = JSON.stringify({
      statusText: data.item.statusText || "",
      noteText: data.item.noteText || "",
    });
    setMessage("Đã lưu tự động");
  }

  function scheduleAutosave(recordId: string, nextStatusText: string | null, nextNoteText: string | null) {
    const snapshot = JSON.stringify({
      statusText: nextStatusText || "",
      noteText: nextNoteText || "",
    });

    if (!lastSavedSnapshotRef.current[recordId]) {
      lastSavedSnapshotRef.current[recordId] = snapshot;
      return;
    }

    if (lastSavedSnapshotRef.current[recordId] === snapshot) {
      return;
    }

    if (saveTimersRef.current[recordId]) {
      clearTimeout(saveTimersRef.current[recordId]);
    }

    saveTimersRef.current[recordId] = setTimeout(() => {
      void persistRecord(recordId, nextStatusText, nextNoteText);
    }, 450);
  }

  function updateRecordInline(recordId: string, updater: (record: RecordItem) => RecordItem) {
    setRecords((prev) => {
      const next = prev.map((record) => (record.id === recordId ? updater(record) : record));
      const changed = next.find((record) => record.id === recordId);
      if (changed) {
        scheduleAutosave(recordId, changed.statusText, changed.noteText);
      }
      return next;
    });
  }

  async function assignStaff(recordId: string, nextAssignedStaffId: string | null) {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              assignedStaffId: nextAssignedStaffId,
              assignedStaff: staffOptions.find((staff) => staff.id === nextAssignedStaffId) || null,
            }
          : record,
      ),
    );

    const response = await fetch(`/api/phone-records/${recordId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedStaffId: nextAssignedStaffId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Không thể phân công");
      return;
    }
    setRecords((prev) => prev.map((item) => (item.id === recordId ? data.item : item)));
    setMessage("Đã cập nhật phân công");
  }

  async function copyText(value: string | null | undefined) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setMessage("Đã copy");
  }

  function goToPage() {
    const nextPage = Math.min(Math.max(Number(pageInput || 1), 1), pagination.totalPages);
    updateUrl({ page: nextPage, q, status, assignedStaffId });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Tìm số điện thoại"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateUrl({ q, page: 1 });
            }}
          />
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              updateUrl({ status: e.target.value, page: 1 });
            }}
          >
            <option value="">Tất cả ghi chú/status</option>
            {autocompleteSuggestions.slice(0, 50).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </Select>
          <Select
            value={assignedStaffId}
            onChange={(e) => {
              setAssignedStaffId(e.target.value);
              updateUrl({ assignedStaffId: e.target.value, page: 1 });
            }}
          >
            <option value="">Tất cả nhân viên</option>
            {staffOptions.map((item) => (
              <option key={item.id} value={item.id}>{item.username}</option>
            ))}
          </Select>
          <Button variant="secondary" onClick={() => { setQ(""); setStatus(""); setAssignedStaffId(""); updateUrl({ q: "", status: "", assignedStaffId: "", page: 1 }); }}>
            Xóa bộ lọc
          </Button>
        </div>
      </Card>

      <Card className="space-y-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-slate-500">
            Đang hiển thị {(pagination.page - 1) * pagination.pageSize + 1}
            {" - "}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} / {pagination.total}
          </div>
          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
            <Button
              variant="secondary"
              disabled={pagination.page <= 1}
              onClick={() => updateUrl({ page: pagination.page - 1, q, status, assignedStaffId })}
            >
              Trang trước
            </Button>
            <Button
              variant="secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => updateUrl({ page: pagination.page + 1, q, status, assignedStaffId })}
            >
              Trang sau
            </Button>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              {pagination.page} / {pagination.totalPages}
            </div>
            <Input
              className="!w-[70px] shrink-0"
              inputMode="numeric"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") goToPage();
              }}
              placeholder="Trang"
            />
            <Button className="shrink-0" variant="primary" onClick={goToPage}>
              Đi
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-[1.1fr_1.1fr_auto] gap-4 border-b border-slate-200 pb-3 text-sm font-semibold text-slate-900">
          <div>Số điện thoại</div>
          <div>Ghi chú</div>
          <div className="text-right">Thao tác</div>
        </div>

        <div className="space-y-5">
          {records.map((item) => (
            <RecordRow
              key={item.id}
              item={item}
              canAssign={canAssign}
              staffOptions={staffOptions}
              suggestions={autocompleteSuggestions}
              onStatusChange={(recordId, value) => updateRecordInline(recordId, (record) => ({ ...record, statusText: value }))}
              onAssign={(recordId, nextAssignedStaffId) => void assignStaff(recordId, nextAssignedStaffId)}
              onCopy={(value) => void copyText(value)}
            />
          ))}

          {records.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Không có dữ liệu phù hợp.</div>
          ) : null}
        </div>
      </Card>

      {message ? <div className="text-sm text-slate-500">{message}</div> : null}
    </div>
  );
}
