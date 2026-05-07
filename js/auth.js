import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, ref, set, get } from './firebase-config.js';

export async function registerWarga(email, password, profileData) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await set(ref(db, `users/${user.uid}`), {
            uid: user.uid, email, nama: profileData.nama || user.email.split('@')[0],
            nik: profileData.nik || '', noRumah: profileData.noRumah || '',
            role: 'warga', isActive: true, createdAt: new Date().toISOString()
        });
        return { success: true, message: 'Registrasi berhasil! Silakan login.' };
    } catch (error) {
        return { success: false, error: translateError(error.code) };
    }
}

export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const snap = await get(ref(db, `users/${user.uid}`));
        const profile = snap.exists() ? snap.val() : {};
        return { success: true, userData: { uid: user.uid, email, nama: profile.nama || user.email, role: profile.role || 'warga', nik: profile.nik, noRumah: profile.noRumah } };
    } catch (error) {
        return { success: false, error: translateError(error.code) };
    }
}

export async function logoutUser() {
    try { await signOut(auth); return { success: true }; } catch (error) { return { success: false, error: error.message }; }
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const snap = await get(ref(db, `users/${user.uid}`));
            const profile = snap.exists() ? snap.val() : {};
            callback({ isLoggedIn: true, uid: user.uid, email: user.email, nama: profile.nama || user.email, role: profile.role || 'warga' });
        } else {
            callback({ isLoggedIn: false });
        }
    });
}

function translateError(code) {
    const msgs = { 'auth/invalid-email': 'Email tidak valid.', 'auth/user-not-found': 'Email tidak terdaftar.', 'auth/wrong-password': 'Password salah.', 'auth/email-already-in-use': 'Email sudah digunakan.', 'auth/weak-password': 'Password minimal 6 karakter.', 'auth/network-request-failed': 'Koneksi internet bermasalah.' };
    return msgs[code] || 'Terjadi kesalahan: ' + code;
}