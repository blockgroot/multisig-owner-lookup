import fs from "fs";
import path from "path";

type AddressBookEntry = {
  address: string;
  name: string;
  chainId: number;
};

function parseCSV(csv: string): AddressBookEntry[] {
  const lines = csv.trim().split("\n");
  const header = lines.shift(); // remove header

  if (!header?.toLowerCase().includes("address")) {
    throw new Error("CSV must start with: address,name,chainId");
  }

  const rows: AddressBookEntry[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const [address, name, chainIdRaw] = line.split(",");

    if (!address || !name || !chainIdRaw) continue;

    rows.push({
      address: address.trim(),
      name: name.trim(),
      chainId: Number(chainIdRaw.trim()),
    });
  }

  return rows;
}

function normalize(entries: AddressBookEntry[]): AddressBookEntry[] {
  const seen = new Set<string>();
  const out: AddressBookEntry[] = [];

  for (const e of entries) {
    const key = `${e.address.toLowerCase()}-${e.chainId}`;
    if (seen.has(key)) continue;

    seen.add(key);

    out.push({
      address: e.address,
      name: e.name,
      chainId: e.chainId,
    });
  }

  return out;
}

function generateTS(entries: AddressBookEntry[]): string {
  const rows = entries
    .map(
      (e) =>
        `  { address: "${e.address}", name: "${e.name}", chainId: ${e.chainId} },`
    )
    .join("\n");

  return `
// AUTO-GENERATED FILE — DO NOT EDIT

export type AddressBookEntry = {
  address: string;
  name: string;
  chainId: number;
};

export const ADDRESS_BOOK: AddressBookEntry[] = [
${rows}
];

export const ADDRESS_BOOK_INDEX: Record<number, Record<string, string>> = (() => {
  const index: Record<number, Record<string, string>> = {};
  for (const e of ADDRESS_BOOK) {
    const addr = e.address.toLowerCase();
    if (!index[e.chainId]) index[e.chainId] = {};
    index[e.chainId][addr] = e.name;
  }
  return index;
})();
`;
}

function main() {
  const file = process.argv[2];

  if (!file) {
    console.error("Usage: ts-node csv-to-addressbook.ts <file.csv>");
    process.exit(1);
  }

  const csv = fs.readFileSync(file, "utf8");
  const parsed = parseCSV(csv);
  const normalized = normalize(parsed);
  const ts = generateTS(normalized);

  const out = path.basename(file).replace(".csv", ".ts");
  fs.writeFileSync(out, ts);

  console.log(`Generated ${out}`);
}

main();
