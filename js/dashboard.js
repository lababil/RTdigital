// js/dashboard.js
import { checkAuth, db, ref, onValue, get } from './firebase-config.js';

let currentUser = {};
let cctvPlayer = null;

// Load data saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔄 Loading dashboard.js...');
        
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
        
        // Load data statistik
        loadStatistik();
        
        // Load informasi RT
        loadInformasiRT();
        
        // Initialize CCTV
        initCCTV();
        
        console.log('✅ Dashboard initialized');
        
    } catch (error) {
        console.error('❌ Error loading user:', error);
        alert('Terjadi kesalahan. Silakan refresh halaman.');
    }
});

// Load statistik
function loadStatistik() {
    // Total Warga
    onValue(ref(db, 'warga'), (snapshot) => {
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        document.getElementById('totalWarga').textContent = count;
    });
    
    // Kas RT
    onValue(ref(db, 'keuangan/kasRT'), (snapshot) => {
        const data = snapshot.val() || {};
        const total = Object.values(data).reduce((sum, item) => {
            return item.tipe === 'masuk' ? sum + (item.jumlah || 0) : sum - (item.jumlah || 0);
        }, 0);
        document.getElementById('kasRT').textContent = `Rp ${total.toLocaleString('id-ID')}`;
    });
    
    // Uang Keamanan
    onValue(ref(db, 'keuangan/keamanan'), (snapshot) => {
        const data = snapshot.val() || {};
        const total = Object.values(data).reduce((sum, item) => sum + (item.jumlah || 0), 0);
        document.getElementById('uangKeamanan').textContent = `Rp ${total.toLocaleString('id-ID')}`;
    });
    
    // Uang Jimpitan
    onValue(ref(db, 'keuangan/jimpitan'), (snapshot) => {
        const data = snapshot.val() || {};
        const total = Object.values(data).reduce((sum, item) => sum + (item.jumlah || 0), 0);
        document.getElementById('uangJimpitan').textContent = `Rp ${total.toLocaleString('id-ID')}`;
    });
}

// Load informasi RT
async function loadInformasiRT() {
    const rtInfoContainer = document.getElementById('rtInfo');
    if (!rtInfoContainer) return;

    try {
        // Asumsi menggunakan Firestore (sesuaikan jika menggunakan Realtime Database)
        // Jika data kosong, tampilkan pesan "Belum ada pengumuman"
        const snapshot = await getDocs(collection(db, "pengumuman")); // Ganti sesuai struktur DB Anda
        
        if (snapshot.empty) {
            rtInfoContainer.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-info-circle mb-2"></i>
                    <p>Belum ada pengumuman terbaru saat ini.</p>
                </div>`;
            return;
        }

        let html = '<ul class="list-group list-group-flush">';
        snapshot.forEach((doc) => {
            const data = doc.data();
            html += `
                <li class="list-group-item border-0 px-0 mb-2">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1 fw-bold text-dark">${data.judul || 'Tanpa Judul'}</h6>
                        <small class="text-muted">${data.tanggal || ''}</small>
                    </div>
                    <p class="mb-1 text-muted small">${data.isi || ''}</p>
                </li>`;
        });
        html += '</ul>';
        rtInfoContainer.innerHTML = html;

    } catch (error) {
        console.error("Error loading RT Info:", error);
        rtInfoContainer.innerHTML = `
            <div class="alert alert-light text-center small">
                Gagal memuat informasi. Pastikan koneksi internet stabil.
            </div>`;
    }
}

// Simple CCTV link handler
async function initCCTV() {
    try {
        const statusBadge = document.getElementById('cctvStatus');
        const cctvLink = document.getElementById('cctvLink');
        
        // Get config from Firebase
        const snap = await get(ref(db, 'settings/cctv'));
        if (snap.exists()) {
            const config = snap.val();
            if (config.url && config.youtubeId) {
                // Jika YouTube
                cctvLink.href = `https://www.youtube.com/watch?v=${config.youtubeId}`;
                statusBadge.className = 'badge bg-success';
                statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Live';
            } else if (config.url) {
                // Jika URL custom
                cctvLink.href = config.url;
            }
        } else {
            // Default ke JambiTV
            cctvLink.href = 'https://jambitv.co.id/live-tv/';
        }
    } catch (err) {
        console.error('CCTV Init Error:', err);
        // Set default link
        const cctvLink = document.getElementById('cctvLink');
        if (cctvLink) cctvLink.href = 'https://jambitv.co.id/live-tv/';
    }
}
        // Set source
        cctvPlayer.src({ type: mimeType, src: streamUrl });
        
        // Try to play
        await cctvPlayer.play().catch(err => {
            console.log('⚠️ Autoplay prevented:', err);
            // Browser memblokir autoplay dengan suara
            cctvPlayer.muted(true);
            return cctvPlayer.play();
        });
        
        // Event listeners
        cctvPlayer.on('loadedmetadata', () => {
            console.log('✅ Stream loaded successfully');
            statusBadge.className = 'badge bg-success';
            statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Live';
        });
        
        cctvPlayer.on('playing', () => {
            console.log('▶️ Stream playing');
            statusBadge.className = 'badge bg-success';
            statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Playing';
        });
        
        cctvPlayer.on('waiting', () => {
            console.log('⏳ Stream buffering...');
            statusBadge.className = 'badge bg-warning text-dark';
            statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Buffering';
        });
        
        cctvPlayer.on('error', () => {
            const error = cctvPlayer.error();
            console.error('❌ Video.js error:', error);
            statusBadge.className = 'badge bg-danger';
            statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Error';
            
            // Show error message
            setTimeout(() => {
                alert('⚠️ Gagal memutar stream CCTV.\n\nKemungkinan penyebab:\n1. URL stream tidak valid\n2. Server stream offline\n3. Masalah CORS\n4. Format tidak didukung\n\nSilakan hubungi admin untuk konfigurasi ulang.');
            }, 2000);
        });
        
        cctvPlayer.on('ended', () => {
            console.log('⏹️ Stream ended');
            statusBadge.className = 'badge bg-secondary';
            statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Selesai';
        });
        
    } catch (err) {
        console.error('❌ CCTV Init Error:', err);
        statusBadge.className = 'badge bg-danger';
        statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Error';
    }
}

// Logout function
window.logout = async function() {
    if(confirm('Yakin ingin keluar?')) {
        try {
            // Jika pakai Firebase Auth
            const { auth } = await import('./firebase-config.js');
            await auth.signOut();
        } catch (e) {
            console.log('Local logout only');
        }
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
};

// Cleanup saat halaman unload
window.addEventListener('beforeunload', () => {
    if (cctvPlayer) {
        cctvPlayer.dispose();
    }
});
