// Family passcode (phone). Everyone signs in to one shared Firebase account
// whose password is the family passcode; firestore.rules only lets that
// account in. The sign-in is remembered on the device.
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { app } from "./firebase";

export const FAMILY_EMAIL = "family@family-packing.example";

let _auth = null;
if (app) {
  try {
    _auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    _auth = getAuth(app);
  }
}

export const watchSignedIn = (cb) => (_auth ? onAuthStateChanged(_auth, (u) => cb(!!u), () => cb(false)) : (cb(true), () => {}));
export const signIn = (passcode) => signInWithEmailAndPassword(_auth, FAMILY_EMAIL, passcode);
