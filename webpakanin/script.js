import { initializeApp } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.1.3/firebase-database.js";

// ============================================================
// 🚨 CONFIG FIREBASE KAMU 🚨
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyDzt8XET9FgArrHRTclven7oNkDpyADNqE", 
  authDomain: "webiot-a1050.firebaseapp.com",
  databaseURL: "https://webiot-a1050-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "webiot-a1050",
  storageBucket: "webiot-a1050.firebasestorage.app",
  messagingSenderId: "732495017948",
  appId: "1:732495017948:web:e21f86c6cbd1d5a53c0119",
  measurementId: "G-TL0E9YTY3V"
};
// ============================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Referensi
const persenRef = ref(db, 'data/persentase');
const jarakRef = ref(db, 'data/jarak');
const tombolRef = ref(db, 'control/feed_now');
const jadwalWaktuRef = ref(db, 'control/schedule_time');
const jadwalAktifRef = ref(db, 'control/schedule_active');

// Elemen HTML
const foodFillElement = document.getElementById('food-fill');
const persenTextElement = document.getElementById('persen-text');
const jarakTextElement = document.getElementById('jarak-text');
const statusBadgeElement = document.getElementById('status-badge-main');
const lastUpdateElement = document.getElementById('last-update-text');
const feedButton = document.getElementById('btn-feed');
const inputTime = document.getElementById('input-time');
const toggleSchedule = document.getElementById('toggle-schedule');
const btnSaveSchedule = document.getElementById('btn-save-schedule');
const statusSchedule = document.getElementById('schedule-status');

// --- LOGIKA ALERT AUDIO ---
const alertSound = document.getElementById('alert-sound');
let hasPlayedAlert = false; 

function playAlertSmart() {
    if (alertSound && !hasPlayedAlert) {
        alertSound.currentTime = 0;
        alertSound.play().catch(e => console.log("Audio block:", e));
        hasPlayedAlert = true; // Kunci biar cuma bunyi sekali
    }
}

// --- CLICK SPARK ---
document.addEventListener('click', (e) => {
    const colors = ['#00bcd4', '#009688', '#4dd0e1', '#ffffff']; 
    const particleCount = 8; 
    for (let i = 0; i < particleCount; i++) {
        const spark = document.createElement('div');
        spark.classList.add('spark');
        spark.style.left = e.pageX + 'px';
        spark.style.top = e.pageY + 'px';
        spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = 20 + Math.random() * 20;
        const tx = Math.cos(angle) * velocity + 'px';
        const ty = Math.sin(angle) * velocity + 'px';
        
        spark.style.setProperty('--tx', tx);
        spark.style.setProperty('--ty', ty);
        document.body.appendChild(spark);
        setTimeout(() => spark.remove(), 400);
    }
});

// --- CHART ---
const ctx = document.getElementById('feedChart').getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(0, 188, 212, 0.5)'); 
gradient.addColorStop(1, 'rgba(0, 188, 212, 0.0)'); 

const feedChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Level Pakan',
            data: [],
            borderColor: '#00bcd4',
            borderWidth: 3,
            backgroundColor: gradient,
            fill: true, tension: 0.4,
            pointBackgroundColor: '#fff', pointBorderColor: '#00838f', pointRadius: 4
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
        }
    }
});

function addDataToChart(label, data) {
    feedChart.data.labels.push(label);
    feedChart.data.datasets[0].data.push(data);
    if(feedChart.data.labels.length > 15) {
        feedChart.data.labels.shift();
        feedChart.data.datasets[0].data.shift();
    }
    feedChart.update();
}

// --- UPDATE DASHBOARD ---
function updateUI(persentase, jarak) {
    persenTextElement.innerText = persentase + "%";
    jarakTextElement.innerText = jarak + " cm";
    foodFillElement.style.height = persentase + "%";

    statusBadgeElement.classList.remove('loading', 'aman', 'kritis');
    
    // Logika Kritis & Suara
    if (persentase <= 20) {
        statusBadgeElement.innerText = "KRITIS (Isi Segera)";
        statusBadgeElement.classList.add('kritis');
        playAlertSmart(); // Bunyikan alarm
    } else {
        statusBadgeElement.innerText = "AMAN";
        statusBadgeElement.classList.add('aman');
        hasPlayedAlert = false; // Reset alarm
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    lastUpdateElement.innerText = timeString;
    addDataToChart(timeString, persentase);
}

// FIREBASE LISTENERS
onValue(persenRef, (snapshot) => {
    const data = snapshot.val();
    if (data !== null) {
        onValue(jarakRef, (snapJarak) => {
             const dJarak = snapJarak.val();
             if(dJarak) updateUI(Math.round(data), parseFloat(dJarak).toFixed(2));
        }, {onlyOnce: true});
    }
});

// BUTTON FEED
feedButton.addEventListener('click', () => {
    const originalContent = feedButton.innerHTML;
    feedButton.innerHTML = `<div class="btn-content"><i class="fa-solid fa-spinner fa-spin"></i> Mengirim...</div>`;
    feedButton.disabled = true;
    set(tombolRef, 1).then(() => {
        setTimeout(() => { 
            feedButton.innerHTML = `<div class="btn-content"><i class="fa-solid fa-check"></i> Berhasil!</div>`;
            setTimeout(() => { feedButton.innerHTML = originalContent; feedButton.disabled = false; }, 1500);
        }, 1000);
    });
});

// SCHEDULE
onValue(jadwalWaktuRef, (snap) => { if(snap.val()) inputTime.value = snap.val(); });
onValue(jadwalAktifRef, (snap) => { toggleSchedule.checked = (snap.val() == 1); });
btnSaveSchedule.addEventListener('click', () => {
    const waktu = inputTime.value;
    const aktif = toggleSchedule.checked ? 1 : 0;
    if(!waktu) { alert("Pilih jam dulu!"); return; }
    set(jadwalWaktuRef, waktu);
    set(jadwalAktifRef, aktif).then(() => {
        statusSchedule.innerText = "Tersimpan ✅"; statusSchedule.style.color = "green";
        setTimeout(() => statusSchedule.innerText = "", 2000);
    });
});