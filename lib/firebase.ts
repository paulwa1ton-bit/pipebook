import { initializeApp, getApps, FirebaseOptions } from "firebase/app";
import { initializeAuth, getAuth, connectAuthEmulator, Auth } from "firebase/auth";
// @ts-ignore - getReactNativePersistence exists at runtime in firebase/auth for RN, typings lag behind
import { getReactNativePersistence } from "firebase/auth";
import { initializeFirestore, getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Filled in from app.json's "extra.firebase" block (Firebase console > Project
// settings > Your apps > SDK setup and configuration). Until it's filled in the
// app runs fully offline and the backup section says it isn't set up.
const extra = Constants.expoConfig?.extra?.firebase ?? {};
const firebaseConfig: FirebaseOptions = {
  apiKey: extra.apiKey ?? "REPLACE_ME",
  authDomain: extra.authDomain ?? "REPLACE_ME.firebaseapp.com",
  projectId: extra.projectId ?? "REPLACE_ME",
  storageBucket: extra.storageBucket ?? "REPLACE_ME.appspot.com",
  messagingSenderId: extra.messagingSenderId ?? "REPLACE_ME",
  appId: extra.appId ?? "REPLACE_ME",
};

export const isFirebaseConfigured = !String(firebaseConfig.apiKey).startsWith("REPLACE_ME");

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// getReactNativePersistence is RN-only: on web it hangs initializeAuth forever,
// and the web SDK already persists via IndexedDB with plain getAuth().
let authInstance: Auth;
if (Platform.OS === "web") {
  authInstance = getAuth(firebaseApp);
} else {
  try {
    authInstance = initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // initializeAuth throws if already called (e.g. fast refresh)
    authInstance = getAuth(firebaseApp);
  }
}
export const auth = authInstance;

// Optional fields (phone, notes...) are undefined when blank; Firestore rejects
// undefined values unless told to drop them.
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
} catch {
  dbInstance = getFirestore(firebaseApp);
}
export const db = dbInstance;

// For local development/testing against `firebase emulators:start`: set
// extra.firebase.emulatorHost (e.g. "127.0.0.1") in app.json. Never set in a release build.
const emulatorHost: string | undefined = extra.emulatorHost;
if (emulatorHost && !(globalThis as { __pipebookEmulators?: boolean }).__pipebookEmulators) {
  (globalThis as { __pipebookEmulators?: boolean }).__pipebookEmulators = true;
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}
