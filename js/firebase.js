import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// COLOQUE SUAS CHAVES DO FIREBASE AQUI
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "gestaofinanceira-e99b3.firebaseapp.com",
  projectId: "gestaofinanceira-e99b3",
  storageBucket: "gestaofinanceira-e99b3.firebasestorage.app",
  messagingSenderId: "379186488475",
  appId: "1:379186488475:web:..."
};

let app, auth, db;

try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.error("Firebase não inicializado. Verifique as chaves em firebase.js", e);
}

export { auth, db, signInWithEmailAndPassword, onAuthStateChanged, signOut, doc, setDoc, getDoc };
