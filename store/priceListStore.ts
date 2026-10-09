import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PriceList } from "@/types/models";

// Imported merchant price lists. Kept apart from the main book because a list
// can hold thousands of items: this way typing in a job doesn't re-save them.
// Lists are only ever added or removed whole (re-importing replaces), which
// keeps backup simple: lib/priceListSync uploads/deletes whole lists.

interface PriceListState {
  lists: PriceList[];
  pendingUpload: string[];
  pendingDelete: string[];

  /** Adds a list, replacing any existing list from the same supplier. */
  importList: (list: PriceList) => void;
  removeList: (id: string) => void;
  markAllPending: () => void;
  applySync: (lists: PriceList[], pendingUpload: string[], pendingDelete: string[]) => void;
  clear: () => void;
}

const sameSupplier = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const usePriceListStore = create<PriceListState>()(
  persist(
    (set) => ({
      lists: [],
      pendingUpload: [],
      pendingDelete: [],

      importList: (list) =>
        set((s) => {
          const replaced = s.lists.filter((l) => sameSupplier(l.supplier, list.supplier)).map((l) => l.id);
          return {
            lists: [...s.lists.filter((l) => !replaced.includes(l.id)), list],
            pendingUpload: [...s.pendingUpload.filter((id) => !replaced.includes(id)), list.id],
            pendingDelete: [...s.pendingDelete, ...replaced],
          };
        }),

      removeList: (id) =>
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== id),
          pendingUpload: s.pendingUpload.filter((p) => p !== id),
          pendingDelete: [...s.pendingDelete, id],
        })),

      markAllPending: () =>
        set((s) => ({ pendingUpload: [...new Set([...s.pendingUpload, ...s.lists.map((l) => l.id)])] })),

      applySync: (lists, pendingUpload, pendingDelete) => set({ lists, pendingUpload, pendingDelete }),

      clear: () => set({ lists: [], pendingUpload: [], pendingDelete: [] }),
    }),
    { name: "pipebook-price-lists", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
