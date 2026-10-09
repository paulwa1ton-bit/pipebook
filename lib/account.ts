import { signInWithEmail, signOutFirebase, signUpWithEmail, SignedInUser } from "@/lib/auth";
import { pendingChangeCount, syncNow } from "@/lib/cloudSync";
import { useBookStore } from "@/store/bookStore";
import { usePriceListStore } from "@/store/priceListStore";

/**
 * Links this phone's book to the signed-in account. If the phone has never
 * synced with this account (first sign-up, or the plumber used the app offline
 * before making an account) everything on it is queued for upload, so no work
 * logged before signing up is lost.
 */
export function attachAccount(user: SignedInUser): Promise<void> {
  const store = useBookStore.getState();
  if (store.lastSyncedUid !== user.uid) {
    store.markEverythingPending();
    usePriceListStore.getState().markAllPending();
  }
  store.setAccount(user);
  return syncNow();
}

export async function createAccount(email: string, password: string): Promise<void> {
  await attachAccount(await signUpWithEmail(email, password));
}

export async function logIn(email: string, password: string): Promise<void> {
  await attachAccount(await signInWithEmail(email, password));
}

/** Tries a last backup, then reports how many changes would be lost by logging out now. */
export async function prepareLogOut(): Promise<number> {
  await syncNow();
  return pendingChangeCount();
}

/** Logs out and clears this phone, so the next person to sign in starts clean. */
export async function logOut(): Promise<void> {
  await signOutFirebase();
  useBookStore.getState().clearLocalData();
  usePriceListStore.getState().clear();
}
