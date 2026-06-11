export type CsvRow = Record<string, string>;

export function parseCsv(input: string): CsvRow[] {
  const rows = parseCsvRecords(input.trim());
  if (rows.length === 0) {
    return [];
  }

  const [headers, ...records] = rows;
  return records
    .filter((record) => record.some((value) => value.trim() !== ""))
    .map((record) => {
      const row: CsvRow = {};
      headers.forEach((header, index) => {
        row[header.trim()] = record[index]?.trim() ?? "";
      });
      return row;
    });
}

export function stringifyCsv(rows: CsvRow[], headers: string[]): string {
  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? "")).join(",")),
  ].join("\n");
}

function parseCsvRecords(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
      continue;
    }

    if (char === ",") {
      record.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      continue;
    }

    if (char !== "\r") {
      field += char;
    }
  }

  record.push(field);
  records.push(record);
  return records;
}

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
