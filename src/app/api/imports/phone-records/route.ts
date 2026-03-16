import { getSessionUser } from "@/lib/auth";
import { badRequest, forbidden, ok, serverError } from "@/lib/api";
import { db } from "@/lib/db";
import { runPhoneRecordImport } from "@/lib/import-phone-records";
import { canAssignRecord, canManageUsers } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || !(await canManageUsers(currentUser.role, currentUser.id))) return forbidden();
    const formData = await request.formData();
    const file = formData.get("file");
    const assignedStaffId = String(formData.get("assignedStaffId") || "").trim() || null;
    if (!(file instanceof File)) return badRequest("Thiếu file import");
    if (!file.name.toLowerCase().endsWith(".xlsx")) return badRequest("Chỉ hỗ trợ file .xlsx");
    if (!(await canAssignRecord(currentUser.role, currentUser.id, assignedStaffId))) return badRequest("Không thể gán data cho nhân viên ngoài tổ");
    if (assignedStaffId) {
      const staff = await db.user.findUnique({ where: { id: assignedStaffId } });
      if (!staff || staff.role !== "staff" || !staff.isActive) return badRequest("Nhân viên nhận data không hợp lệ");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runPhoneRecordImport({ fileName: file.name, fileBuffer: buffer, importedByUserId: currentUser.id, importedByRole: currentUser.role, assignedStaffId });
    return ok(result);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : "Import thất bại");
  }
}
