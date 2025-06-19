import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase project configuration – provided by user
const firebaseConfig = {
  apiKey: 'AIzaSyCB_jzP2yve39lgUjXo_1gMVnQmTQJtznQ',
  authDomain: 'healthcare1234-4c52b.firebaseapp.com',
  projectId: 'healthcare1234-4c52b',
  storageBucket: 'healthcare1234-4c52b.appspot.com',
  messagingSenderId: '306445002018',
  appId: '1:306445002018:web:e6903510b05bdd7ecef17b',
  measurementId: 'G-6741SP6VQD',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
