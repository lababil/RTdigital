import { checkAuth, db, ref, push, remove, onValue } from './firebase-config.js';
let currentUser = {};
const cats = ['kasRT','keamanan','jimpitan','denda'];

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = await new Promise(resolve => checkAuth(resolve));
    if (!currentUser.isLoggedIn) return window.location.href = 'index.html';
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
    cats.forEach(c => {
        onValue(ref(db, `keuangan/${c}`), snap => { renderTable(c, snap.val()||{}); });
    });
});

cats.forEach(cat => {
    const form = document.getElementById(`form${cat}`);
    if(!form) return;
    form.addEventListener('submit', async e => {
        e.preventDefault(); if(currentUser.role !== 'admin') return alert('Hanya admin!');
        const data = { createdAt: new Date().toISOString(), inputBy: currentUser.uid };
        if(cat === 'kasRT') { data.tipe = document.getElementById('kasTipe').value; data.jumlah = Number(document.getElementById('kasJumlah').value); data.tanggal = document.getElementById('kasTanggal').value; data.keterangan = document.getElementById('kasKeterangan').value; }
        else { data.nama = document.getElementById(`${cat}Nama`).value; data.rumah = document.getElementById(`${cat}Rumah`).value; data.jumlah = Number(document.getElementById(`${cat}Jumlah`).value); data.tanggal = document.getElementById(`${cat}Tanggal`).value; data.keterangan = document.getElementById(`${cat}Keterangan`).value || ''; if(cat==='denda') data.alasan = document.getElementById('dendaAlasan').value; }
        await push(ref(db, `keuangan/${cat}`), data); alert('Tersimpan!'); e.target.reset();
    });
});

function renderTable(cat, data) {
    const tbody = document.getElementById(`body${cat}`); tbody.innerHTML = '';
    const items = Object.entries(data).sort((a,b) => new Date(b[1].createdAt) - new Date(a[1].createdAt));
    items.forEach(([id, d]) => {
        const row = tbody.insertRow();
        let cells = `<td>${d.tanggal}</td>`;
        if(cat !== 'kasRT') cells += `<td>${d.nama}</td><td>${d.rumah}</td>`;
        if(cat === 'denda') cells += `<td>${d.alasan}</td>`;
        cells += `<td>Rp ${d.jumlah.toLocaleString('id-ID')}</td>`;
        if(cat === 'kasRT') cells += `<td>${d.tipe}</td>`;
        cells += `<td>${d.keterangan||'-'}</td><td class="admin-only"><button class="btn btn-sm btn-danger" onclick="hapusKeuangan('${cat}','${id}')"><i class="fas fa-trash"></i></button></td>`;
        row.innerHTML = cells;
    });
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', currentUser.role !== 'admin'));
}

window.hapusKeuangan = async (cat, id) => { if(currentUser.role !== 'admin' || !confirm('Hapus?')) return; await remove(ref(db, `keuangan/${cat}/${id}`)); };

// ✅ FUNGSI EXPORT PDF PER KATEGORI - VERSI STABIL
window.exportToPDF = async (cat) => {
    try {
        // Pastikan jsPDF sudah load
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('Library PDF sedang dimuat. Silakan coba lagi dalam 2 detik.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Ambil Data dari Firebase
        const snap = await new Promise(res => 
            onValue(ref(db, `keuangan/${cat}`), s => res(s.val() || {}), { onlyOnce: true })
        );
        const data = Object.values(snap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Header
        const namaKategori = cat === 'kasRT' ? 'KAS RT' : 
                            cat === 'keamanan' ? 'UANG KEAMANAN' : 
                            cat === 'jimpitan' ? 'UANG JIMPITAN' : 'UANG DENDA';

        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(`Laporan ${namaKategori} - RTdigital`, 14, 20);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);

        // Siapkan Data Tabel
        const head = cat === 'kasRT' 
            ? [['Tanggal', 'Tipe', 'Jumlah', 'Keterangan']] 
            : [['Tanggal', 'Nama', 'No.Rumah', 'Jumlah', 'Keterangan']];
            
        const body = data.map(d => cat === 'kasRT'
            ? [d.tanggal, d.tipe, `Rp ${d.jumlah.toLocaleString('id-ID')}`, d.keterangan || '-']
            : [d.tanggal, d.nama, d.rumah, `Rp ${d.jumlah.toLocaleString('id-ID')}`, d.keterangan || '-']
        );

        // Generate Tabel
        doc.autoTable({
            head: head,
            body: body,
            startY: 35,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [26, 188, 156], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        // Download
        doc.save(`Laporan_${cat}_${Date.now()}.pdf`);
        
    } catch (err) {
        console.error("PDF Export Error:", err);
        alert("Gagal export PDF: " + err.message);
    }
};

// ✅ FUNGSI EXPORT SEMUA PDF - VERSI STABIL
window.exportAllPDF = async () => {
    try {
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('Library PDF sedang dimuat. Silakan coba lagi.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('LAPORAN KEUANGAN LENGKAP', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text('RTdigital - ' + new Date().toLocaleDateString('id-ID'), 105, 30, { align: 'center' });

        let yPos = 45;
        const cats = [
            { id: 'kasRT', nama: 'KAS RT' },
            { id: 'keamanan', nama: 'UANG KEAMANAN' },
            { id: 'jimpitan', nama: 'UANG JIMPITAN' },
            { id: 'denda', nama: 'UANG DENDA' }
        ];

        doc.setFontSize(12);
        for (const cat of cats) {
            const snap = await new Promise(res => 
                onValue(ref(db, `keuangan/${cat.id}`), s => res(s.val() || {}), { onlyOnce: true })
            );
            const total = Object.values(snap).reduce((sum, d) => sum + (d.jumlah || 0), 0);

            doc.setFont(undefined, 'bold');
            doc.setTextColor(26, 188, 156);
            doc.text(`${cat.nama}`, 14, yPos);
            
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Total: Rp ${total.toLocaleString('id-ID')}`, 14, yPos + 7);
            
            yPos += 15;
        }

        doc.save(`Laporan_Keuangan_Lengkap_${Date.now()}.pdf`);
        
    } catch (err) {
        console.error("PDF All Error:", err);
        alert("Gagal export PDF: " + err.message);
    }
};