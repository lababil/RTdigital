// js/kependudukan.js
import { checkAuth, db, ref, push, remove, onValue } from './firebase-config.js';

let currentUser = {};

// Load data saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔄 Loading kependudukan.js...');
        
        currentUser = await new Promise(resolve => checkAuth(resolve));
        
        if (!currentUser.isLoggedIn) {
            console.log('❌ User tidak login, redirect ke index.html');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('✅ User loaded:', currentUser);
        
        // Update UI dengan data user
        document.getElementById('userName').textContent = currentUser.nama;
        document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
        
        // Tampilkan/sembunyikan elemen admin
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.toggle('hidden', currentUser.role !== 'admin');
        });
        
        // Load data warga
        loadWarga();
        
        console.log('✅ Kependudukan page initialized');
        
    } catch (error) {
        console.error('❌ Error loading user:', error);
        alert('Terjadi kesalahan. Silakan refresh halaman.');
    }
});

// Handle form submit
document.getElementById('formWarga').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('📝 Form submitted');
    
    // Validasi role - warga bisa input, admin bisa semua
    if (!currentUser) {
        alert('Session tidak ditemukan. Silakan login ulang.');
        return;
    }
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Menyimpan...';
    
    try {
        // Ambil file KK
        const fileInput = document.getElementById('fileKK');
        let fileBase64 = '';
        let fileSize = 0;
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            
            console.log('📎 File selected:', file.name, file.size, 'bytes');
            
            // Validasi tipe file
            if (file.type !== 'application/pdf') {
                throw new Error('File harus berformat PDF!');
            }
            
            // Validasi ukuran (max 300KB)
            fileSize = file.size;
            const fileSizeKB = fileSize / 1024;
            if (fileSizeKB > 300) {
                throw new Error(`Ukuran file ${fileSizeKB.toFixed(1)} KB melebihi batas 300 KB!`);
            }
            
            // Convert ke Base64
            console.log('🔄 Converting file to Base64...');
            fileBase64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    console.log('✅ File converted to Base64');
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        
        // Siapkan data
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
            fileKK: fileBase64,
            fileSize: fileSize,
            inputBy: currentUser.uid,
            inputByName: currentUser.nama,
            createdAt: new Date().toISOString()
        };
        
        console.log('💾 Saving data to Firebase...');
        
        // Simpan ke Firebase
        await push(ref(db, 'warga'), data);
        
        console.log('✅ Data saved successfully');
        
        // Reset form
        e.target.reset();
        document.getElementById('fileInfo').innerHTML = '';
        
        alert('✅ Data warga berhasil disimpan!');
        
    } catch (error) {
        console.error('❌ Error saving data:', error);
        alert('❌ Gagal menyimpan data: ' + error.message);
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
});

// Load data warga
function loadWarga() {
    console.log('🔄 Loading data warga...');
    
    onValue(ref(db, 'warga'), (snapshot) => {
        const tbody = document.getElementById('tabelWarga');
        if (!tbody) {
            console.error('❌ Tabel body not found');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (!snapshot.exists()) {
            console.log('ℹ️ No data found');
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-inbox"></i> Belum ada data warga</td></tr>';
            return;
        }
        
        const warga = snapshot.val();
        let no = 1;
        
        Object.entries(warga).forEach(([key, data]) => {
            const row = tbody.insertRow();
            
            const fileSizeKB = data.fileSize ? (data.fileSize / 1024).toFixed(1) : '0';
            
            row.innerHTML = `
                <td>${no++}</td>
                <td>${data.nik || '-'}</td>
                <td><strong>${data.nama || '-'}</strong></td>
                <td>${data.noRumah || '-'}</td>
                <td>${data.jk || '-'}</td>
                <td>
                    ${data.fileKK 
                        ? `<button class="btn btn-sm btn-success" onclick="window.downloadKK('${key}', '${data.nik || ''}')" title="Download KK">
                               <i class="fas fa-file-pdf me-1"></i>PDF (${fileSizeKB} KB)
                           </button>`
                        : '<span class="text-muted"><i class="fas fa-times-circle"></i> Tidak ada</span>'
                    }
                </td>
                <td class="admin-only">
                    <button class="btn btn-sm btn-danger" onclick="window.hapusWarga('${key}')" title="Hapus data">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
        });
        
        // Hide/show admin buttons based on role
        document.querySelectorAll('.admin-only').forEach(el => {
            el.classList.toggle('hidden', currentUser.role !== 'admin');
        });
        
        console.log(`✅ Loaded ${no-1} warga`);
        
    }, (error) => {
        console.error('❌ Error loading data:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle"></i> Gagal memuat data</td></tr>';
    });
}

// Download KK (Base64)
window.downloadKK = (key, nik) => {
    console.log('⬇️ Downloading KK for:', key);
    
    onValue(ref(db, `warga/${key}`), (snapshot) => {
        if (!snapshot.exists()) {
            alert('Data tidak ditemukan!');
            return;
        }
        
        const data = snapshot.val();
        if (!data.fileKK) {
            alert('File KK tidak tersedia!');
            return;
        }
        
        try {
            // Create download link
            const link = document.createElement('a');
            link.href = data.fileKK;
            link.download = `KK_${nik || data.nik || key}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('✅ Download initiated');
            
        } catch (error) {
            console.error('❌ Error downloading file:', error);
            alert('Gagal mendownload file: ' + error.message);
        }
        
    }, { onlyOnce: true });
};

// Hapus warga (Admin only)
window.hapusWarga = async (key) => {
    console.log('🗑️ Deleting warga:', key);
    
    if (currentUser.role !== 'admin') {
        alert('Akses ditolak! Hanya admin yang bisa menghapus data.');
        return;
    }
    
    if (!confirm('Apakah Anda yakin ingin menghapus data warga ini?\n\nTindakan ini tidak dapat dibatalkan.')) {
        return;
    }
    
    try {
        await remove(ref(db, `warga/${key}`));
        alert('✅ Data berhasil dihapus!');
        console.log('✅ Data deleted successfully');
    } catch (error) {
        console.error('❌ Error deleting data:', error);
        alert('❌ Gagal menghapus data: ' + error.message);
    }
};

// Logout function
window.logout = function() {
    if(confirm('Yakin ingin keluar?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};