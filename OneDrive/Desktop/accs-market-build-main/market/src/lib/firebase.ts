// Firebase configuration
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Firebase configuration with environment variables
const firebaseConfig = {
  apiKey: "AIzaSyD92EjHS_Th7PfKiwZQyRbDDj6PmyLJTY0",
  authDomain: "projec-cca43.firebaseapp.com",
  projectId: "projec-cca43",
  storageBucket: "projec-cca43.firebasestorage.app",
  messagingSenderId: "198187490796",
  appId: "1:198187490796:web:120d4fa367e26b21a274c9",
  measurementId: "G-JQDC4K9T0K",
  databaseURL: "https://projec-cca43-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const rtdb = getDatabase(app);

export { db, storage, auth, rtdb };
