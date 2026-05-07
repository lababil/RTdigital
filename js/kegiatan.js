import { checkAuth, db, ref, push, update, onValue } from './firebase-config.js';
let currentUser = {};

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await new Promise(resolve => checkAuth(resolve));
    if (!currentUser.isLoggedIn) return window.location.href = 'index.html';
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
    loadPengumuman(); loadKegiatan(); loadSurat();
});

document.getElementById('formPengumuman').addEventListener('submit', async e => {
    e.preventDefault(); if(currentUser.role !== 'admin') return alert('Hanya admin!');
    await push(ref(db, 'pengumuman'), { judul: document.getElementById('judulPengumuman').value, isi: document.getElementById('isiPengumuman').value, createdAt: new Date().toISOString() });
    alert('Dipublikasikan!'); e.target.reset();
});

document.getElementById('formKegiatan').addEventListener('submit', async e => {
    e.preventDefault(); if(currentUser.role !== 'admin') return alert('Hanya admin!');
    await push(ref(db, 'kegiatan'), { nama: document.getElementById('namaKegiatan').value, tgl: document.getElementById('tglKegiatan').value, lokasi: document.getElementById('lokasiKegiatan').value, desk: document.getElementById('deskKegiatan').value, createdAt: new Date().toISOString() });
    alert('Tersimpan!'); e.target.reset();
});

document.getElementById('formSurat').addEventListener('submit', async e => {
    e.preventDefault();
    await push(ref(db, 'surat'), { nama: document.getElementById('namaPemohon').value, nik: document.getElementById('nikPemohon').value, jenis: document.getElementById('jenisSurat').value, keperluan: document.getElementById('keperluanSurat').value, status: 'Pending', createdAt: new Date().toISOString(), uid: currentUser.uid });
    alert('Permohonan diajukan!'); e.target.reset();
});

function loadPengumuman() {
    onValue(ref(db, 'pengumuman'), snap => {
        const div = document.getElementById('daftarPengumuman'); div.innerHTML = '';
        if(!snap.exists()) return;
        Object.values(snap.val()).reverse().forEach(d => {
            div.innerHTML += `<div class="card mb-2"><div class="card-body"><h5>${d.judul}</h5><p>${d.isi}</p><small class="text-muted">${new Date(d.createdAt).toLocaleDateString('id-ID')}</small></div></div>`;
        });
    });
}

function loadKegiatan() {
    onValue(ref(db, 'kegiatan'), snap => {
        const div = document.getElementById('daftarKegiatan'); div.innerHTML = '';
        if(!snap.exists()) return;
        Object.values(snap.val()).reverse().forEach(d => {
            div.innerHTML += `<div class="card mb-2"><div class="card-body"><h5>${d.nama}</h5><p><i class="fas fa-calendar"></i> ${d.tgl} | <i class="fas fa-map-marker-alt"></i> ${d.lokasi}</p><p>${d.desk}</p></div></div>`;
        });
    });
}

function loadSurat() {
    onValue(ref(db, 'surat'), snap => {
        const tbody = document.getElementById('tabelSurat'); tbody.innerHTML = '';
        if(!snap.exists()) return;
        Object.entries(snap.val()).forEach(([id, d]) => {
            if(currentUser.role === 'admin' || d.uid === currentUser.uid) {
                const row = tbody.insertRow();
                row.innerHTML = `<td>${new Date(d.createdAt).toLocaleDateString('id-ID')}</td><td>${d.nama}</td><td>${d.jenis}</td><td><span class="badge ${d.status==='Pending'?'badge-warning':'badge-success'}">${d.status}</span></td>${currentUser.role==='admin'?`<td><button class="btn btn-sm btn-success" onclick="setujuSurat('${id}')">Setuju</button></td>`:''}`;
            }
        });
    });
}

window.setujuSurat = async id => { if(currentUser.role !== 'admin') return; await update(ref(db, `surat/${id}`), { status: 'Disetujui' }); };