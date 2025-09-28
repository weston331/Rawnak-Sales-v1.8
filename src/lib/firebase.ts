
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableIndexedDbPersistence } from "firebase/firestore";

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const isFirebaseConfigured = !!firebaseConfig.apiKey;

if (isFirebaseConfigured) {
  // Initialize Firebase
  console.log(`\n==============\n[Firebase] Connecting to project: ${firebaseConfig.projectId}\n==============\n`);
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);

  // Enable offline persistence
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db)
      .catch((err) => {
          if (err.code == 'failed-precondition') {
              // Multiple tabs open, persistence can only be enabled
              // in one tab at a time.
              console.warn("[Firebase] Persistence failed: multiple tabs open. Offline data will be synced in one tab only.");
          } else if (err.code == 'unimplemented') {
              // The current browser does not support all of the
              // features required to enable persistence
              console.warn("[Firebase] Persistence is not supported in this browser. The app will work online only.");
          }
      });
  }
}


export { app, db, isFirebaseConfigured };
