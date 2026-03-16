"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type StaffOption = { id: string; username: string; role: "admin" | "staff" };
type ImportJobItem = {
  id: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  duplicateRows: number;
  invalidRows: number;
  status: string;
  createdAt: string;
  assignedStaff: { id: string; username: string; role: string } | null;
  duplicates: Array<{
    id: string;
    rowNumber: number;
    phoneRaw: string;
    phoneLast9: string | null;
    reason: string;
  }>;
};

type ImportResult = {
  totalRows: number;
  successRows: number;
  duplicateRows: number;
  invalidRows: number;
  duplicates: Array<{
    rowNumber: number;
    phoneRaw: string;
    phoneLast9: string | null;
    reason: string;
  }>;
  invalids: Array<{
    rowNumber: number;
    phoneRaw: string;
    reason: string;
  }>;
};

export function ImportsClient({ staffOptions, initialJobs }: { staffOptions: StaffOption[]; initialJobs: ImportJobItem[] }) {
  const [assignedStaffId, setAssignedStaffId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [jobs, setJobs] = useState(initialJobs);

  async function submitImport() {
    if (!selectedFile) {
      setMessage("Vui lòng chọn file .xlsx");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (assignedStaffId) formData.append("assignedStaffId", assignedStaffId);

    setLoading(true);
    setMessage(null);
    setResult(null);

    const response = await fetch("/api/imports/phone-records", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error || "Import thất bại");
      return;
    }

    setResult(data);
    setMessage("Import hoàn tất");

    const jobsResponse = await fetch("/api/imports");
    const jobsData = await jobsResponse.json();
    if (jobsResponse.ok) setJobs(jobsData.items);
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <div>
          <div className="text-lg font-semibold">Import file .xlsx</div>
          <div className="text-sm text-slate-500">Hệ thống chỉ đọc số điện thoại ở cột A, chuẩn hóa về 9 số cuối và bỏ số trùng.</div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Chọn file .xlsx</label>
            <input type="file" accept=".xlsx" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Gán cho nhân viên</label>
            <Select value={assignedStaffId} onChange={(e) => setAssignedStaffId(e.target.value)}>
              <option value="">Chưa gán</option>
              {staffOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.username}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={submitImport} disabled={loading}>{loading ? "Đang import..." : "Bắt đầu import"}</Button>
          {message ? <span className="text-sm text-slate-500">{message}</span> : null}
        </div>
      </Card>

      {result ? (
        <Card className="space-y-4">
          <div className="text-lg font-semibold">Kết quả import</div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Tổng dòng</div><div className="text-2xl font-semibold">{result.totalRows}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Thành công</div><div className="text-2xl font-semibold">{result.successRows}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Trùng lặp</div><div className="text-2xl font-semibold">{result.duplicateRows}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-sm text-slate-500">Lỗi format</div><div className="text-2xl font-semibold">{result.invalidRows}</div></div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <div className="mb-2 font-medium">Danh sách số trùng</div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr><th className="px-3 py-2">Dòng</th><th className="px-3 py-2">Số gốc</th><th className="px-3 py-2">9 số</th><th className="px-3 py-2">Lý do</th></tr>
                  </thead>
                  <tbody>
                    {result.duplicates.map((item, index) => (
                      <tr key={`${item.rowNumber}-${index}`} className="border-b border-slate-100">
                        <td className="px-3 py-2">{item.rowNumber}</td>
                        <td className="px-3 py-2">{item.phoneRaw}</td>
                        <td className="px-3 py-2 font-mono">{item.phoneLast9 || "-"}</td>
                        <td className="px-3 py-2">{item.reason}</td>
                      </tr>
                    ))}
                    {result.duplicates.length === 0 ? <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Không có số trùng.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="mb-2 font-medium">Danh sách lỗi format</div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <tr><th className="px-3 py-2">Dòng</th><th className="px-3 py-2">Số gốc</th><th className="px-3 py-2">Lý do</th></tr>
                  </thead>
                  <tbody>
                    {result.invalids.map((item, index) => (
                      <tr key={`${item.rowNumber}-${index}`} className="border-b border-slate-100">
                        <td className="px-3 py-2">{item.rowNumber}</td>
                        <td className="px-3 py-2">{item.phoneRaw}</td>
                        <td className="px-3 py-2">{item.reason}</td>
                      </tr>
                    ))}
                    {result.invalids.length === 0 ? <tr><td className="px-3 py-3 text-slate-500" colSpan={3}>Không có lỗi format.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="text-lg font-semibold">Lịch sử import gần đây</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Nhân viên</th>
                <th className="px-3 py-2">Tổng</th>
                <th className="px-3 py-2">OK</th>
                <th className="px-3 py-2">Trùng</th>
                <th className="px-3 py-2">Lỗi</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">{job.fileName}</td>
                  <td className="px-3 py-3">{job.assignedStaff?.username || "Chưa gán"}</td>
                  <td className="px-3 py-3">{job.totalRows}</td>
                  <td className="px-3 py-3">{job.successRows}</td>
                  <td className="px-3 py-3">{job.duplicateRows}</td>
                  <td className="px-3 py-3">{job.invalidRows}</td>
                </tr>
              ))}
              {jobs.length === 0 ? <tr><td className="px-3 py-3 text-slate-500" colSpan={6}>Chưa có lịch sử import.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
