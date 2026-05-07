import { checkAuth, db, ref, set, update, get, auth } from './firebase-config.js';
let currentUser = {};

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await new Promise(resolve => checkAuth(resolve));
    if (!currentUser.isLoggedIn) return window.location.href = 'index.html';
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
    loadSettings();
});

document.getElementById('formProfilRT').addEventListener('submit', async e => {
    e.preventDefault(); if(currentUser.role !== 'admin') return alert('Hanya admin!');
    await set(ref(db, 'settings/rt'), { rt: document.getElementById('rt').value, rw: document.getElementById('rw').value, desa: document.getElementById('desa').value, kecamatan: document.getElementById('kecamatan').value, kabupaten: document.getElementById('kabupaten').value });
    alert('Profil disimpan!');
});

document.getElementById('formUbahPassword').addEventListener('submit', async e => {
    e.preventDefault();
    const newP = document.getElementById('passBaru').value;
    const confP = document.getElementById('passKonfirmasi').value;
    if(newP !== confP) return alert('Password tidak cocok!');
    try {
        const { updatePassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        await updatePassword(auth.currentUser, newP);
        alert('Password diubah!'); e.target.reset();
    } catch(err) { alert('Gagal: ' + err.message); }
});

window.backupData = async () => {
    const snap = await get(ref(db, '/'));
    const blob = new Blob([JSON.stringify(snap.val(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_rtdigital_${Date.now()}.json`; a.click();
};

window.restoreData = async () => {
    if(currentUser.role !== 'admin') return alert('Hanya admin!');
    const file = document.getElementById('fileBackup').files[0];
    if(!file) return alert('Pilih file backup!');
    if(!confirm('Data saat ini akan ditimpa. Lanjutkan?')) return;
    const text = await file.text(); await set(ref(db, '/'), JSON.parse(text)); alert('Restore berhasil!');
};

function loadSettings() {
    get(ref(db, 'settings/rt')).then(snap => {
        if(snap.exists()) { const d = snap.val(); document.getElementById('rt').value = d.rt||''; document.getElementById('rw').value = d.rw||''; document.getElementById('desa').value = d.desa||''; document.getElementById('kecamatan').value = d.kecamatan||''; document.getElementById('kabupaten').value = d.kabupaten||''; }
    });
}

// Simpan Konfigurasi CCTV
document.getElementById('formCCTV')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await set(ref(db, 'settings/cctv'), {
        url: document.getElementById('cctvUrl').value,
        updatedAt: new Date().toISOString()
    });
    alert('✅ Link CCTV tersimpan! Refresh dashboard untuk melihat perubahan.');
});

// Load Konfigurasi saat halaman dibuka
function loadCCTVConfig() {
    get(ref(db, 'settings/cctv')).then(snap => {
        if (snap.exists()) {
            document.getElementById('cctvUrl').value = snap.val().url || '';
        }
    });
}
if(document.getElementById('formCCTV')) loadCCTVConfig();
window.logout = () => import('./auth.js').then(m => m.logoutUser().then(() => window.location.href = 'index.html'));