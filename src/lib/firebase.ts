import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

let db: Firestore | null = null;
let firebaseApp = null;
let isInitialized = false;

try {
  firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  const customDbId = firebaseConfigJson.firestoreDatabaseId;
  if (customDbId && customDbId !== '(default)') {
    db = getFirestore(firebaseApp, customDbId);
  } else {
    db = getFirestore(firebaseApp);
  }
  isInitialized = true;
} catch (err) {
  console.warn('Firebase Firestore initialization warning:', err);
}

export { firebaseApp, db, isInitialized };
