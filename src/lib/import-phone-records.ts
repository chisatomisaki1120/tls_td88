import * as XLSX from "xlsx";
import { ImportJobStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizePhoneToLast9 } from "@/lib/phone";

type RunImportArgs = {
  fileName: string;
  fileBuffer: Buffer;
  importedByUserId: string;
  importedByRole: "admin" | "leader" | "staff";
  assignedStaffId?: string | null;
};

type InvalidItem = {
  rowNumber: number;
  phoneRaw: string;
  reason: string;
};

type DuplicateItem = {
  rowNumber: number;
  phoneRaw: string;
  phoneLast9: string | null;
  reason: string;
  existingRecordId?: string | null;
};

export async function runPhoneRecordImport(args: RunImportArgs) {
  const workbook = XLSX.read(args.fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("File Excel không có sheet nào");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  const importJob = await db.importJob.create({
    data: {
      fileName: args.fileName,
      importedByUserId: args.importedByUserId,
      assignedStaffId: args.assignedStaffId || null,
      status: ImportJobStatus.processing,
    },
  });

  const invalids: InvalidItem[] = [];
  const duplicates: DuplicateItem[] = [];
  const seenInFile = new Set<string>();
  let successRows = 0;
  let totalRows = 0;

  const dataRows = rows.slice(1);

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index] ?? [];
    const rowNumber = index + 2;
    const phoneRaw = String(row[0] ?? "").trim();

    if (!phoneRaw) {
      continue;
    }

    totalRows += 1;
    const phoneLast9 = normalizePhoneToLast9(phoneRaw);
    if (!phoneLast9) {
      invalids.push({ rowNumber, phoneRaw, reason: "Invalid phone format" });
      continue;
    }

    if (seenInFile.has(phoneLast9)) {
      duplicates.push({
        rowNumber,
        phoneRaw,
        phoneLast9,
        reason: "Duplicate by last 9 digits in same file",
      });
      continue;
    }

    const existing = await db.phoneRecord.findUnique({ where: { phoneLast9 } });
    if (existing) {
      duplicates.push({
        rowNumber,
        phoneRaw,
        phoneLast9,
        reason: "Duplicate by last 9 digits",
        existingRecordId: existing.id,
      });
      continue;
    }

    seenInFile.add(phoneLast9);

    await db.phoneRecord.create({
      data: {
        phoneRaw,
        phoneLast9,
        assignedStaffId: args.assignedStaffId || null,
        leaderId: args.importedByRole === "leader" ? args.importedByUserId : null,
        importJobId: importJob.id,
        createdById: args.importedByUserId,
        updatedById: args.importedByUserId,
      },
    });

    successRows += 1;
  }

  if (duplicates.length > 0) {
    await db.importDuplicate.createMany({
      data: duplicates.map((item) => ({
        importJobId: importJob.id,
        rowNumber: item.rowNumber,
        phoneRaw: item.phoneRaw,
        phoneLast9: item.phoneLast9,
        existingRecordId: item.existingRecordId || null,
        reason: item.reason,
      })),
    });
  }

  const updatedJob = await db.importJob.update({
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
      assignedStaff: { select: { id: true, name: true, role: true } },
      importedBy: { select: { id: true, name: true, role: true } },
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
}
