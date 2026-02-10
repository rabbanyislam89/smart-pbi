import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⚠️ নিচের এই অংশটুকু মুছে আপনার কপি করা 'firebaseConfig' পেস্ট করুন
const firebaseConfig = {
  apiKey: "AIzaSyANQhzVGlRrApkjjJWyjc9x2KlS4tDdgKY",
  authDomain: "smart-pbi-assistant.firebaseapp.com",
  projectId: "smart-pbi-assistant",
  storageBucket: "smart-pbi-assistant.firebasestorage.app",
  messagingSenderId: "260450921305",
  appId: "1:260450921305:web:1baccd62fff21596af7a48",
  measurementId: "G-YW800B2VYS"
};
// ⚠️ পেস্ট করা শেষ হলে নিচে হাত দিবেন না

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);