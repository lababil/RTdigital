// js/kependudukan.js
import { checkAuth, db, ref, push, remove, onValue } from './firebase-config.js';
// Tambahkan import Firebase Storage
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

let currentUser = {};
const storage = getStorage();

// Load data saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    try {
        currentUser = await new Promise(resolve => checkAuth(resolve));
        if (!currentUser.isLoggedIn) {
            window.location.href = 'index.html';
            return;
        }
        
        document.getElementById('userName').textContent = currentUser.nama;
        document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
        
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.toggle('hidden', currentUser.role !== 'admin');
        });
        
        loadWarga();
    } catch (error) {
        alert('Terjadi kesalahan. Silakan refresh halaman.');
    }
});

// Handle form submit
document.getElementById('formWarga').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return alert('Session tidak ditemukan. Silakan login ulang.');
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Menyimpan...';
    
    try {
        const fileInput = document.getElementById('fileKK');
        let fileUrl = '';
        let fileSize = 0;
        let storagePath = '';
        
        // Upload File ke Firebase Storage (Bukan Base64)
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.type !== 'application/pdf') throw new Error('File harus berformat PDF!');
            
            fileSize = file.size;
            if (fileSize / 1024 > 300) throw new Error(`Ukuran file melebihi batas 300 KB!`);
            
            storagePath = `kk_warga/${Date.now()}_${file.name}`;
            const fileRef = storageRef(storage, storagePath);
            
            console.log('🔄 Uploading ke Storage...');
            const snapshot = await uploadBytes(fileRef, file);
            fileUrl = await getDownloadURL(snapshot.ref);
            console.log('✅ Upload Storage Berhasil');
        }
        
        const data = {
            nik: document.getElementById('nik').value,
            nama: document.getElementById('nama').value,
            noRumah: document.getElementById('noRumah').value,
            tempatLahir: document.getElementById('tempatLahir').value,
            tglLahir: document.getElementById('tglLahir').value,
            jk: document.getElementById('jk').value,
            agama: document.getElementById('agama').value || '',
            pendidikan: document.getElementById('pendidikan').value || '',
            pekerjaan: document.getElementById('pekerjaan').value || '',
            fileKKUrl: fileUrl, // Simpan Link URL-nya saja
            storagePath: storagePath, // Simpan path untuk hapus file nanti
            fileSize: fileSize,
            inputBy: currentUser.uid,
            inputByName: currentUser.nama,
            createdAt: new Date().toISOString()
        };
        
        await push(ref(db, 'warga'), data);
        
        e.target.reset();
        document.getElementById('fileInfo').innerHTML = '';
        alert('✅ Data warga berhasil disimpan!');
        
    } catch (error) {
        alert('❌ Gagal menyimpan data: ' + error.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
});

function loadWarga() {
    onValue(ref(db, 'warga'), (snapshot) => {
        const tbody = document.getElementById('tabelWarga');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!snapshot.exists()) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-inbox"></i> Belum ada data warga</td></tr>';
            return;
        }
        
        let no = 1;
        Object.entries(snapshot.val()).forEach(([key, data]) => {
            const row = tbody.insertRow();
            const fileSizeKB = data.fileSize ? (data.fileSize / 1024).toFixed(1) : '0';
            
            row.innerHTML = `
                <td>${no++}</td>
                <td>${data.nik || '-'}</td>
                <td><strong>${data.nama || '-'}</strong></td>
                <td>${data.noRumah || '-'}</td>
                <td>${data.jk || '-'}</td>
                <td>
                    ${data.fileKKUrl || data.fileKK 
                        ? `<button class="btn btn-sm btn-success" onclick="window.downloadKK('${data.fileKKUrl || data.fileKK}')" title="Lihat/Download KK">
                               <i class="fas fa-file-pdf me-1"></i>PDF
                           </button>`
                        : '<span class="text-muted"><i class="fas fa-times-circle"></i> Tidak ada</span>'
                    }
                </td>
                <td class="admin-only">
                    <button class="btn btn-sm btn-danger" onclick="window.hapusWarga('${key}', '${data.storagePath || ''}')" title="Hapus data">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
        
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.toggle('hidden', currentUser.role !== 'admin');
        });
    });
}

// Buka link PDF langsung (Browser otomatis mendownload/membuka PDF)
window.downloadKK = (url) => {
    if (url.startsWith('data:')) {
        // Fallback jika masih ada data Base64 lama
        const link = document.createElement('a');
        link.href = url;
        link.download = `KK_Warga.pdf`;
        link.click();
    } else {
        window.open(url, '_blank');
    }
};

window.hapusWarga = async (key, storagePath) => {
    if (currentUser.role !== 'admin') return alert('Akses ditolak!');
    if (!confirm('Hapus data warga ini?')) return;
    
    try {
        // Hapus dari Realtime Database
        await remove(ref(db, `warga/${key}`));
        
        // Hapus file dari Storage jika ada
        if (storagePath) {
            const fileRef = storageRef(storage, storagePath);
            await deleteObject(fileRef).catch(e => console.log('File mungkin sudah terhapus di storage'));
        }
        
        alert('✅ Data berhasil dihapus!');
    } catch (error) {
        alert('❌ Gagal menghapus data: ' + error.message);
    }
};

window.logout = function() {
    if(confirm('Yakin ingin keluar?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};
