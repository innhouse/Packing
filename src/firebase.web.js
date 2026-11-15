import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseConfig } from "../firebaseConfig";

export const firebaseReady =
  !!firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("PASTE_");

let _db = null;
let _app = null;
if (firebaseReady) {
  _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  try {
    // Browser: keep a copy on the device so the list opens and edits queue offline.
    _db = initializeFirestore(_app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    _db = getFirestore(_app);
  }
}
export const db = _db;
export const app = _app;
