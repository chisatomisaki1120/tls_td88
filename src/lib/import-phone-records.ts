import * as XLSX from "xlsx";
import { ImportJobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizePhoneToLast9 } from "@/lib/phone";
import { resolveTeamLeadIdForUser } from "@/lib/team";

type RunImportArgs = { fileName: string; fileBuffer: Buffer; importedByUserId: string; importedByRole: "admin" | "staff"; assignedStaffId?: string | null };
type InvalidItem = { rowNumber: number; phoneRaw: string; reason: string };
type DuplicateItem = { rowNumber: number; phoneRaw: string; phoneLast9: string | null; reason: string; existingRecordId?: string | null };

const BATCH_SIZE = 5000;

export async function runPhoneRecordImport(args: RunImportArgs) {
  const workbook = XLSX.read(args.fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("File Excel không có sheet nào");

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, { header: 1, raw: false, defval: "" });
  const dataRows = rows.slice(1);

  // --- Phase 1: Parse & validate all rows in memory (no DB queries) ---
  const invalids: InvalidItem[] = [];
  const inFileDuplicates: DuplicateItem[] = [];
  const seenInFile = new Map<string, { rowNumber: number; phoneRaw: string }>();
  const validRows: { rowNumber: number; phoneRaw: string; phoneLast9: string }[] = [];
  let totalRows = 0;

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index] ?? [];
    const rowNumber = index + 2;
    const phoneRaw = String(row[0] ?? "").trim();
    if (!phoneRaw) continue;

    totalRows += 1;
    const phoneLast9 = normalizePhoneToLast9(phoneRaw);
    if (!phoneLast9) {
      invalids.push({ rowNumber, phoneRaw, reason: "Invalid phone format" });
      continue;
    }

    if (seenInFile.has(phoneLast9)) {
      inFileDuplicates.push({ rowNumber, phoneRaw, phoneLast9, reason: "Duplicate by last 9 digits in same file" });
      continue;
    }

    seenInFile.set(phoneLast9, { rowNumber, phoneRaw });
    validRows.push({ rowNumber, phoneRaw, phoneLast9 });
  }

  // --- Phase 2: Batch lookup existing phoneLast9 in DB ---
  const dbDuplicates: DuplicateItem[] = [];
  const newRows: typeof validRows = [];
  const allPhoneLast9 = validRows.map((r) => r.phoneLast9);

  for (let i = 0; i < allPhoneLast9.length; i += BATCH_SIZE) {
    const batch = allPhoneLast9.slice(i, i + BATCH_SIZE);
    const existingRecords = await db.phoneRecord.findMany({
      where: { phoneLast9: { in: batch } },
      select: { id: true, phoneLast9: true },
    });
    const existingMap = new Map(existingRecords.map((r) => [r.phoneLast9, r.id]));

    for (let j = 0; j < batch.length; j++) {
      const row = validRows[i + j]!;
      const existingId = existingMap.get(row.phoneLast9);
      if (existingId) {
        dbDuplicates.push({ rowNumber: row.rowNumber, phoneRaw: row.phoneRaw, phoneLast9: row.phoneLast9, reason: "Duplicate by last 9 digits", existingRecordId: existingId });
      } else {
        newRows.push(row);
      }
    }
  }

  const duplicates = [...inFileDuplicates, ...dbDuplicates];

  // --- Phase 3: Write everything inside a transaction ---
  return db.$transaction(async (tx) => {
    const importJob = await tx.importJob.create({
      data: {
        fileName: args.fileName,
        importedByUserId: args.importedByUserId,
        assignedStaffId: args.assignedStaffId || null,
        status: ImportJobStatus.processing,
      },
    });

    const assignedLeaderId = args.assignedStaffId ? await resolveTeamLeadIdForUser(args.assignedStaffId, tx) : null;

    // Batch insert new phone records
    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      await tx.phoneRecord.createMany({
        data: batch.map((row) => ({
          phoneRaw: row.phoneRaw,
          phoneLast9: row.phoneLast9,
          assignedStaffId: args.assignedStaffId || null,
          leaderId: assignedLeaderId,
          importJobId: importJob.id,
          createdById: args.importedByUserId,
          updatedById: args.importedByUserId,
        })),
      });
    }

    // Batch insert duplicates
    if (duplicates.length > 0) {
      for (let i = 0; i < duplicates.length; i += BATCH_SIZE) {
        const batch = duplicates.slice(i, i + BATCH_SIZE);
        await tx.importDuplicate.createMany({
          data: batch.map((item) => ({
            importJobId: importJob.id,
            rowNumber: item.rowNumber,
            phoneRaw: item.phoneRaw,
            phoneLast9: item.phoneLast9,
            existingRecordId: item.existingRecordId || null,
            reason: item.reason,
          })),
        });
      }
    }

    const successRows = newRows.length;
    const updatedJob = await tx.importJob.update({
      where: { id: importJob.id },
      data: {
        totalRows,
        successRows,
        duplicateRows: duplicates.length,
        invalidRows: invalids.length,
        status: ImportJobStatus.done,
        finishedAt: new Date(),
      },
      include: {
        assignedStaff: { select: { id: true, username: true, role: true } },
        importedBy: { select: { id: true, username: true, role: true } },
      },
    });

    return {
      importJob: updatedJob,
      totalRows,
      successRows,
      duplicateRows: duplicates.length,
      invalidRows: invalids.length,
      duplicates,
      invalids,
    };
  }, { maxWait: 10000, timeout: 120000 });
}
