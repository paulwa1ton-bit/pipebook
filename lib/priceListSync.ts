import { deletePriceList, downloadPriceList, listRemotePriceLists, uploadPriceList } from "@/lib/cloudApi";
import { usePriceListStore } from "@/store/priceListStore";

/**
 * Pushes this phone's added/removed price lists, then pulls lists added or
 * removed on other devices. Lists are immutable once imported (re-importing
 * makes a new list), so comparing ids is enough - no field-level merging.
 */
export async function syncPriceLists(uid: string): Promise<void> {
  const start = usePriceListStore.getState();
  const uploading = [...start.pendingUpload];
  const deleting = [...start.pendingDelete];

  for (const id of deleting) await deletePriceList(uid, id);
  for (const id of uploading) {
    const list = usePriceListStore.getState().lists.find((l) => l.id === id);
    if (list) await uploadPriceList(uid, list);
  }

  const remote = await listRemotePriceLists(uid);
  const remoteIds = new Set(remote.map((m) => m.id));
  const now = usePriceListStore.getState();
  const localIds = new Set(now.lists.map((l) => l.id));
  const downloaded = await Promise.all(
    remote
      .filter((m) => !localIds.has(m.id) && !now.pendingDelete.includes(m.id))
      .map((m) => downloadPriceList(uid, m)),
  );

  // Re-read: the plumber may have imported or removed a list meanwhile.
  const current = usePriceListStore.getState();
  const stillPendingUpload = current.pendingUpload.filter((id) => !uploading.includes(id));
  const stillPendingDelete = current.pendingDelete.filter((id) => !deleting.includes(id));
  const lists = [
    ...current.lists.filter((l) => remoteIds.has(l.id) || stillPendingUpload.includes(l.id)),
    ...downloaded.filter((d) => !current.lists.some((l) => l.id === d.id) && !stillPendingDelete.includes(d.id)),
  ];
  current.applySync(lists, stillPendingUpload, stillPendingDelete);
}
