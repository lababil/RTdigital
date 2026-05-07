// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    push, 
    update, 
    remove, 
    onValue 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { 
    getStorage, 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ⚠️ PASTE CONFIG DARI FIREBASE CONSOLE DI SINI ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyC0Gk2Q8Vq-vmkqPVQJ6SC5wOdB9G_XB7g",
  authDomain: "rtdigital-ba4cd.firebaseapp.com",
  databaseURL: "https://rtdigital-ba4cd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rtdigital-ba4cd",
  storageBucket: "rtdigital-ba4cd.firebasestorage.app",
  messagingSenderId: "235080197270",
  appId: "1:235080197270:web:357ec53a9d3b2074720eb7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

export { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updatePassword,
    ref, 
    set, 
    get, 
    push, 
    update, 
    remove, 
    onValue,
    storageRef, 
    uploadBytes, 
    getDownloadURL 
};

export function checkAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const snap = await get(ref(db, `users/${user.uid}`));
                const data = snap.val() || { role: 'warga', nama: user.email };
                callback({
                    isLoggedIn: true,
                    uid: user.uid,
                    email: user.email,
                    nama: data.nama || user.email,
                    role: data.role || 'warga'
                });
            } catch (err) {
                callback({ isLoggedIn: true, role: 'warga', nama: user.email, uid: user.uid });
            }
        } else {
            callback({ isLoggedIn: false });
        }
    });
}
