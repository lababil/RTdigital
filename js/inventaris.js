import { checkAuth, db, ref, push, remove, update, onValue } from './firebase-config.js';
let currentUser = {};

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await new Promise(resolve => checkAuth(resolve));
    if (!currentUser.isLoggedIn) return window.location.href = 'index.html';
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
    loadBarang(); loadPinjaman(); populateDropdown();
});

document.getElementById('formBarang').addEventListener('submit', async e => {
    e.preventDefault(); if(currentUser.role !== 'admin') return alert('Hanya admin!');
    await push(ref(db, 'inventaris/barang'), { nama: document.getElementById('namaBarang').value, jumlah: Number(document.getElementById('jumlahBarang').value), kondisi: document.getElementById('kondisi').value, lokasi: document.getElementById('lokasi').value, createdAt: new Date().toISOString() });
    alert('Barang ditambahkan!'); e.target.reset();
});

document.getElementById('formPinjam').addEventListener('submit', async e => {
    e.preventDefault(); if(currentUser.role !== 'admin') return alert('Hanya admin!');
    await push(ref(db, 'inventaris/pinjaman'), { peminjam: document.getElementById('namaPeminjam').value, barangId: document.getElementById('barangPinjam').value, jumlah: Number(document.getElementById('jumlahPinjam').value), tglPinjam: document.getElementById('tglPinjam').value, tglKembali: document.getElementById('tglKembali').value, status: 'Dipinjam', createdAt: new Date().toISOString() });
    alert('Peminjaman dicatat!'); e.target.reset();
});

function loadBarang() {
    onValue(ref(db, 'inventaris/barang'), snap => {
        const tbody = document.getElementById('tabelBarang'); tbody.innerHTML = '';
        if(!snap.exists()) return;
        Object.entries(snap.val()).forEach(([id, d]) => {
            tbody.insertRow().innerHTML = `<td>${d.nama}</td><td>${d.jumlah}</td><td>${d.kondisi}</td><td>${d.lokasi}</td><td class="admin-only"><button class="btn btn-sm btn-danger" onclick="hapusItem('inventaris/barang','${id}')"><i class="fas fa-trash"></i></button></td>`;
        });
        document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
    });
}

function loadPinjaman() {
    onValue(ref(db, 'inventaris/pinjaman'), snap => {
        const tbody = document.getElementById('tabelPinjam'); tbody.innerHTML = '';
        if(!snap.exists()) return;
        Object.entries(snap.val()).forEach(([id, d]) => {
            const isDone = d.status === 'Dikembalikan';
            tbody.insertRow().innerHTML = `<td>${d.peminjam}</td><td>${d.barangId}</td><td>${d.jumlah}</td><td>${d.tglPinjam}</td><td>${d.tglKembali}</td><td><span class="badge ${isDone?'badge-success':'badge-warning'}">${d.status}</span></td><td class="admin-only">${!isDone?`<button class="btn btn-sm btn-primary" onclick="kembalikan('${id}')">Kembalikan</button>`:''}<button class="btn btn-sm btn-danger" onclick="hapusItem('inventaris/pinjaman','${id}')"><i class="fas fa-trash"></i></button></td>`;
        });
        document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
    });
}

window.kembalikan = async id => { if(currentUser.role !== 'admin') return; await update(ref(db, `inventaris/pinjaman/${id}`), { status: 'Dikembalikan' }); };
window.hapusItem = async (path, id) => { if(currentUser.role !== 'admin' || !confirm('Hapus?')) return; await remove(ref(db, `${path}/${id}`)); };

function populateDropdown() {
    onValue(ref(db, 'inventaris/barang'), snap => {
        const sel = document.getElementById('barangPinjam'); sel.innerHTML = '<option value="">Pilih</option>';
        snap.forEach(c => sel.innerHTML += `<option value="${c.key}">${c.val().nama} (Stok: ${c.val().jumlah})</option>`);
    });
}