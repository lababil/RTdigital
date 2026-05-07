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
  apiKey: "AIzaSyC8Bqx7RJIY05RU_cWg-tn02MOIOjy2iAc",
  authDomain: "rtdigital-c96fc.firebaseapp.com",
  databaseURL: "https://rtdigital-c96fc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rtdigital-c96fc",
  storageBucket: "rtdigital-c96fc.firebasestorage.app",
  messagingSenderId: "866202287618",
  appId: "1:866202287618:web:d3f4669e079d5d85e8711b"
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