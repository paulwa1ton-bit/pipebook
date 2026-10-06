import { useEffect } from "react";
import { isFirebaseConfigured } from "@/lib/firebase";
import { subscribeAuthState } from "@/lib/auth";
import { attachAccount } from "@/lib/account";
import { startAutoSync } from "@/lib/cloudSync";
import { useBookStore } from "@/store/bookStore";

function waitForHydration(): Promise<void> {
  const api = useBookStore.persist;
  if (api.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = api.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

/**
 * Once the local book has loaded, follows Firebase's auth state and keeps the
 * cloud backup running. Does nothing (app stays fully offline) until Firebase
 * is configured in app.json.
 */
export function useCloudBackup(): void {
  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let cancelled = false;
    let stopAutoSync: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    waitForHydration().then(() => {
      if (cancelled) return;
      unsubAuth = subscribeAuthState((user) => {
        const { account, setAccount } = useBookStore.getState();
        if (user && account?.uid !== user.uid) {
          void attachAccount({ uid: user.uid, email: user.email ?? "" });
        } else if (!user && account) {
          // Session expired: keep the data and pending changes on the phone;
          // they upload when the plumber logs back in.
          setAccount(null);
        }
      });
      stopAutoSync = startAutoSync();
    });

    return () => {
      cancelled = true;
      unsubAuth?.();
      stopAutoSync?.();
    };
  }, []);
}
