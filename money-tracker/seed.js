import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBPCdah3AN4Ni8AVuxmURym5BG1YdKluhs",
  authDomain: "kevin-money-management.firebaseapp.com",
  projectId: "kevin-money-management",
  storageBucket: "kevin-money-management.firebasestorage.app",
  messagingSenderId: "401198057920",
  appId: "1:401198057920:web:db4c058f268ae8ddba2025"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultUsers = [
  { id: 'admin-1', username: 'sakhiyarajnikbhai@gmail.com', password: 'kevin@1234', role: 'admin' },
  { id: 'admin-2', username: 'kevin', password: 'kevin1234', role: 'admin' },
  { id: 'user-1', username: 'user1', password: 'pass1', role: 'user' },
  { id: 'user-2', username: 'user2', password: 'pass2', role: 'user' },
  { id: 'user-3', username: 'user3', password: 'pass3', role: 'user' },
  { id: 'user-4', username: 'user4', password: 'pass4', role: 'user' }
];

async function seed() {
  console.log("Seeding Firestore...");
  for (const user of defaultUsers) {
    const userRef = doc(collection(db, 'users'), user.id);
    await setDoc(userRef, user);
    console.log(`Seeded ${user.username}`);
  }
  console.log("Done!");
  process.exit(0);
}

seed().catch(console.error);
