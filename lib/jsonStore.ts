import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const LIST_FILE = path.join(DATA_DIR, "listings.json");

export type Deal = "월세" | "전세" | "매매";
export type Listing = {
  _id: string;
  createdAt: string;
  agent: string;
  code: string;
  dealType: Deal;
  buildingType: string;
  deposit?: number;
  rent?: number;
  mgmt?: number;
  tenantInfo: string;
  address: string;
  addressSub?: string;
  areaM2?: number;
  rooms?: number;
  baths?: number;
  elevator?: "Y" | "N";
  parking?: "가능" | "불가";
  pets?: "가능" | "불가";
  landlord?: string;
  tenant?: string;
  contact1?: string;
  contact2?: string;
  isBiz?: "Y" | "N";
  memo?: string;
  vacant: boolean;
  completed: boolean;
  labelColor?: string;
  loft?: boolean;
  illegal?: boolean;
  photos?: { name: string; dataUrl: string }[];
  updatedAt?: string;
};

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(LIST_FILE);
  } catch {
    await fs.writeFile(LIST_FILE, "[]", "utf8");
  }
}

export async function readListings(): Promise<Listing[]> {
  await ensureFile();
  const raw = await fs.readFile(LIST_FILE, "utf8");
  try {
    const arr = JSON.parse(raw) as Listing[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function writeListings(items: Listing[]) {
  await ensureFile();
  await fs.writeFile(LIST_FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function getListing(id: string) {
  const items = await readListings();
  return items.find((x) => x._id === id) || null;
}

export async function upsertListing(
  id: string | null,
  data: Partial<Listing>
): Promise<Listing> {
  const items = await readListings();
  if (id) {
    const idx = items.findIndex((x) => x._id === id);
    if (idx >= 0) {
      const next = { ...items[idx], ...data, _id: id, updatedAt: new Date().toISOString() };
      items[idx] = next;
      await writeListings(items);
      return next;
    }
  }
  const _id = crypto.randomUUID();
  const now = new Date().toISOString();
  const created: Listing = {
    _id,
    createdAt: data.createdAt ?? now,
    agent: data.agent ?? "",
    code: data.code ?? "",
    dealType: (data.dealType ?? "월세") as Deal,
    buildingType: data.buildingType ?? "",
    deposit: data.deposit ?? 0,
    rent: data.rent ?? 0,
    mgmt: data.mgmt ?? 0,
    tenantInfo: data.tenantInfo ?? "",
    address: data.address ?? "",
    addressSub: data.addressSub,
    areaM2: data.areaM2,
    rooms: data.rooms,
    baths: data.baths,
    elevator: data.elevator ?? "N",
    parking: data.parking ?? "불가",
    pets: data.pets ?? "불가",
    landlord: data.landlord,
    tenant: data.tenant,
    contact1: data.contact1,
    contact2: data.contact2,
    isBiz: data.isBiz ?? "N",
    memo: data.memo ?? "",
    vacant: !!data.vacant,
    completed: !!data.completed,
    labelColor: data.labelColor,
    loft: !!data.loft,
    illegal: !!data.illegal,
    photos: Array.isArray(data.photos) ? data.photos : [],
    updatedAt: now,
  };
  items.unshift(created);
  await writeListings(items);
  return created;
}

export async function deleteListing(id: string) {
  const items = await readListings();
  const next = items.filter((x) => x._id !== id);
  await writeListings(next);
  return items.length !== next.length;
}
