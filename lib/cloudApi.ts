import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BusinessSettings, Customer, Expense, Job } from "@/types/models";

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
