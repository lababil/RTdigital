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
    try {
        const snap = await get(ref(db, 'settings/profil'));
        const container = document.getElementById('rtInfo');
        
        if (!snap.exists()) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <p>Belum ada informasi RT. Admin silakan isi di menu Pengaturan.</p>
                </div>
            `;
            return;
        }
        
        const data = snap.val();
        container.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <p class="mb-2"><i class="fas fa-building text-primary me-2"></i><strong>${data.namaRT || '-'}</strong></p>
                    <p class="mb-2"><i class="fas fa-map-marker-alt text-danger me-2"></i>${data.alamatLengkap || '-'}</p>
                </div>
                <div class="col-md-6">
                    <p class="mb-2"><i class="fas fa-map text-success me-2"></i>${data.kelurahan || '-'}, ${data.kecamatan || '-'}</p>
                    <p class="mb-2"><i class="fas fa-city text-info me-2"></i>${data.kota || '-'}</p>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading RT info:', error);
    }
}

// Initialize CCTV Streaming
async function initCCTV() {
    const statusBadge = document.getElementById('cctvStatus');
    const urlDisplay = document.getElementById('cctvUrlDisplay');
    
    try {
        console.log('🎥 Loading CCTV configuration...');
        
        const snap = await get(ref(db, 'settings/cctv'));
        if (!snap.exists()) {
            console.log('ℹ️ CCTV not configured');
            statusBadge.className = 'badge bg-secondary';
            statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>Terkonfigurasi';
            return;
        }
        
        const config = snap.val();
        const streamUrl = config.url || '';
        const streamType = config.type || 'hls';
        const streamTitle = config.title || 'Live CCTV';
        
        if (!streamUrl) {
            console.log('⚠️ CCTV URL is empty');
            statusBadge.className = 'badge bg-warning text-dark';
            statusBadge.innerHTML = '<i class="fas fa-circle me-1"></i>URL Kosong';
            return;
        }
        
        urlDisplay.textContent = streamUrl;
        
        // Determine MIME type
        let mimeType = 'application/x-mpegURL'; // Default HLS
        if (streamType === 'mp4' || streamUrl.includes('.mp4')) {
            mimeType = 'video/mp4';
        } else if (streamType === 'webm' || streamUrl.includes('.webm')) {
            mimeType = 'video/webm';
        } else if (streamType === 'dash' || streamUrl.includes('.mpd')) {
            mimeType = 'application/dash+xml';
        }
        
        console.log('🎬 Stream URL:', streamUrl);
        console.log('🎬 MIME Type:', mimeType);
        
        // Initialize Video.js player
        if (!cctvPlayer) {
            cctvPlayer = videojs('cctvPlayer', {
                controls: true,
                autoplay: true,
                preload: 'auto',
                muted: true,
                fluid: true,
                responsive: true,
                playbackRates: [0.5, 1, 1.5, 2],
                html5: {
                    vhs: {
                        overrideNative: true,
                        enableLowInitialPlaylist: true
                    }
                }
            });
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