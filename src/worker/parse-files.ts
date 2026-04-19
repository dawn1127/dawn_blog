import "@/lib/load-dotenv";

import type { Prisma } from "@prisma/client";
import ExcelJS from "exceljs";
import { parse as parseCsv } from "csv-parse/sync";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getStorageClient } from "@/lib/storage";
import { streamToBuffer } from "@/lib/storage/read-object";

type RowRecord = Record<string, unknown>;

function summarizeSheet(name: string, rows: RowRecord[]) {
  const columns = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];
  return {
    name,
    rowCount: rows.length,
    columns,
  };
}

function chunkRows(sheetName: string, rows: RowRecord[], chunkSize = 50) {
  const chunks = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push({
      id: `${sheetName}:${index + 1}-${Math.min(index + chunkSize, rows.length)}`,
      sheetName,
      rowStart: index + 1,
      rowEnd: Math.min(index + chunkSize, rows.length),
      rows: rows.slice(index, index + chunkSize),
    });
  }

  return chunks;
}

function findDuplicateValues(rows: RowRecord[], columnPattern: RegExp) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (!columnPattern.test(key) || value === undefined || value === null || value === "") {
        continue;
      }

      const normalized = String(value).trim();
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function normalizeCellValue(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }

    if ("result" in value) {
      return String(value.result ?? "");
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }

  return String(value);
}

function worksheetToRows(worksheet: ExcelJS.Worksheet) {
  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values as ExcelJS.CellValue[];
  const normalizedHeaders = headers
    .slice(1)
    .map((value, index) => normalizeCellValue(value) || `Column ${index + 1}`);
  const rows: RowRecord[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const record: RowRecord = {};

    for (const [index, header] of normalizedHeaders.entries()) {
      record[header] = normalizeCellValue(row.getCell(index + 1).value);
    }

    rows.push(record);
  });

  return rows;
}

async function parseFileRows(filename: string, buffer: Buffer) {
  if (filename.toLowerCase().endsWith(".csv")) {
    const rows = parseCsv(buffer, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    }) as RowRecord[];

    return [{ sheetName: "CSV", rows }];
  }

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  await workbook.xlsx.load(arrayBuffer as never);

  return workbook.worksheets.map((worksheet) => ({
    sheetName: worksheet.name,
    rows: worksheetToRows(worksheet),
  }));
}

async function parseNextFile() {
  const db = getDb();
  const file = await db.fileAsset.findFirst({
    where: {
      parseStatus: "queued",
      kind: "spreadsheet",
      deletedAt: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!file) {
    return false;
  }

  await db.fileAsset.update({
    where: { id: file.id },
    data: { parseStatus: "processing", parseError: null, parseAttempts: { increment: 1 } },
  });

  try {
    const env = getEnv();
    const objectStream = await getStorageClient().getObject(env.S3_BUCKET, file.storageKey);
    const buffer = await streamToBuffer(objectStream);
    const sheetSummaries = [];
    const columnSummaries = [];
    const sampleRows = [];
    const chunks = [];
    const deterministicFindings = [];
    const parsedSheets = await parseFileRows(file.originalName, buffer);

    for (const { sheetName, rows } of parsedSheets) {
      const summary = summarizeSheet(sheetName, rows);
      sheetSummaries.push(summary);
      columnSummaries.push({
        sheetName,
        columns: summary.columns,
      });
      sampleRows.push({
        sheetName,
        rows: rows.slice(0, 10),
      });
      chunks.push(...chunkRows(sheetName, rows));

      const duplicateIps = findDuplicateValues(rows, /ip|address/i);
      if (duplicateIps.length > 0) {
        deterministicFindings.push({
          sheetName,
          type: "duplicate_ip_like_values",
          values: duplicateIps,
        });
      }
    }

    await db.fileIndex.upsert({
      where: { fileAssetId: file.id },
      update: {
        sheetSummaries: sheetSummaries as Prisma.InputJsonValue,
        columnSummaries: columnSummaries as Prisma.InputJsonValue,
        sampleRows: sampleRows as Prisma.InputJsonValue,
        chunks: chunks as Prisma.InputJsonValue,
        deterministicFindings: deterministicFindings as Prisma.InputJsonValue,
      },
      create: {
        fileAssetId: file.id,
        sheetSummaries: sheetSummaries as Prisma.InputJsonValue,
        columnSummaries: columnSummaries as Prisma.InputJsonValue,
        sampleRows: sampleRows as Prisma.InputJsonValue,
        chunks: chunks as Prisma.InputJsonValue,
        deterministicFindings: deterministicFindings as Prisma.InputJsonValue,
      },
    });

    await db.fileAsset.update({
      where: { id: file.id },
      data: { parseStatus: "completed", parseError: null },
    });

    console.log(`Parsed file ${file.id}: ${file.originalName}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error";
    const nextStatus = file.parseAttempts + 1 >= 3 ? "failed" : "queued";
    await db.fileAsset.update({
      where: { id: file.id },
      data: { parseStatus: nextStatus, parseError: message },
    });
    console.error(`Failed to parse file ${file.id}: ${message}`);
  }

  return true;
}

async function main() {
  console.log("File parse worker started.");

  while (true) {
    const didWork = await parseNextFile();

    if (!didWork) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch(async (error) => {
  console.error(error);
  await getDb().$disconnect();
  process.exit(1);
});
