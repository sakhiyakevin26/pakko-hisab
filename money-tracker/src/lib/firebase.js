import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPCdah3AN4Ni8AVuxmURym5BG1YdKluhs",
  authDomain: "kevin-money-management.firebaseapp.com",
  projectId: "kevin-money-management",
  storageBucket: "kevin-money-management.firebasestorage.app",
  messagingSenderId: "401198057920",
  appId: "1:401198057920:web:db4c058f268ae8ddba2025",
  measurementId: "G-CP99W8F38L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
