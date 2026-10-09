import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  BusinessSettings, Customer, Expense, Job, PriceList, PriceListItem, PriceListMeta,
} from "@/types/models";

// Everything for one plumber lives under users/{uid}: the user doc holds the
// business settings and each record type is its own subcollection, so a
// years-long job history never hits Firestore's 1MB-per-document limit.

export type CollectionName = "customers" | "jobs" | "expenses";

export interface CloudSnapshot {
  customers: Customer[];
  jobs: Job[];
  expenses: Expense[];
  settings: BusinessSettings | null;
}

export async function pullAll(uid: string): Promise<CloudSnapshot> {
  const read = async <T>(name: CollectionName) =>
    (await getDocs(collection(db, "users", uid, name))).docs.map((d) => d.data() as T);
  const [customers, jobs, expenses, userDoc] = await Promise.all([
    read<Customer>("customers"),
    read<Job>("jobs"),
    read<Expense>("expenses"),
    getDoc(doc(db, "users", uid)),
  ]);
  const settings = (userDoc.exists() ? userDoc.data().settings : null) as BusinessSettings | null;
  return { customers, jobs, expenses, settings };
}

export interface CloudWrites {
  upserts: { name: CollectionName; record: { id: string } }[];
  deletes: { name: CollectionName; id: string }[];
  settings?: BusinessSettings;
}

const BATCH_LIMIT = 450; // Firestore caps a batch at 500 operations

export async function pushChanges(uid: string, writes: CloudWrites): Promise<void> {
  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [
    ...writes.upserts.map(({ name, record }) => (b: ReturnType<typeof writeBatch>) =>
      b.set(doc(db, "users", uid, name, record.id), record)),
    ...writes.deletes.map(({ name, id }) => (b: ReturnType<typeof writeBatch>) =>
      b.delete(doc(db, "users", uid, name, id))),
  ];
  if (writes.settings) {
    const settings = writes.settings;
    // No merge: a cleared field (e.g. removed logo) must disappear from the cloud too.
    ops.push((b) => b.set(doc(db, "users", uid), { settings }));
  }
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch));
    await batch.commit();
  }
}

// Price lists: one small meta doc per list plus its items split into chunk
// docs (well under Firestore's 1MB document limit), so a 5,000-line list is a
// handful of reads and writes rather than thousands.

const CHUNK_SIZE = 1000;

interface PriceListMetaDoc extends PriceListMeta {
  chunkCount: number;
}

export async function listRemotePriceLists(uid: string): Promise<PriceListMetaDoc[]> {
  return (await getDocs(collection(db, "users", uid, "priceLists"))).docs.map((d) => d.data() as PriceListMetaDoc);
}

export async function downloadPriceList(uid: string, meta: PriceListMetaDoc): Promise<PriceList> {
  const chunks = await Promise.all(
    Array.from({ length: meta.chunkCount }, (_, n) => getDoc(doc(db, "users", uid, "priceLists", meta.id, "chunks", String(n)))),
  );
  const items = chunks.flatMap((c) => (c.exists() ? (c.data().items as PriceListItem[]) : []));
  const { chunkCount: _c, ...rest } = meta;
  return { ...rest, items };
}

export async function uploadPriceList(uid: string, list: PriceList): Promise<void> {
  const { items, ...meta } = list;
  const chunkCount = Math.ceil(items.length / CHUNK_SIZE);
  for (let n = 0; n < chunkCount; n += 10) {
    const batch = writeBatch(db);
    for (let k = n; k < Math.min(n + 10, chunkCount); k++) {
      batch.set(doc(db, "users", uid, "priceLists", list.id, "chunks", String(k)), {
        items: items.slice(k * CHUNK_SIZE, (k + 1) * CHUNK_SIZE),
      });
    }
    await batch.commit();
  }
  // Meta last: another device only downloads a list once it's complete.
  await setDoc(doc(db, "users", uid, "priceLists", list.id), { ...meta, chunkCount } satisfies PriceListMetaDoc);
}

export async function deletePriceList(uid: string, id: string): Promise<void> {
  const chunks = await getDocs(collection(db, "users", uid, "priceLists", id, "chunks"));
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", uid, "priceLists", id));
  chunks.docs.forEach((c) => batch.delete(c.ref));
  await batch.commit();
}
