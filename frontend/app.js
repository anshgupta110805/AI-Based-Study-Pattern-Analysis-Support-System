const API_URL = "http://127.0.0.1:8000/api";
let currentUser = null;
let authToken = localStorage.getItem('token');

// --- Auth Handling ---
async function authRequest(endpoint, body) {
    try {
        const res = await fetch(`${API_URL}/auth/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Auth failed');
        return data;
    } catch (err) {
        console.error("Connectivity Failure:", err, "URL:", `${API_URL}/auth/${endpoint}`);
        showToast(`Neural Link Failure: ${err.message}`, 'error');
        throw err;
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const credentials = { 
        username: document.getElementById('login-user').value, 
        password: document.getElementById('login-pass').value 
    };
    const data = await authRequest('login', credentials);
    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        authToken = data.access_token;
        initApp();
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userData = {
        username: document.getElementById('reg-user').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-pass').value
    };
    await authRequest('register', userData);
    showToast("Identity Initialized. You can now login.", "primary");
    toggleAuth(false);
});

function logout() {
    localStorage.removeItem('token');
    location.reload();
}

// --- Authenticated Fetch ---
async function apiFetch(endpoint, options = {}) {
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (res.status === 401) logout();
    return res;
}

// --- App Initialization ---
// --- Animated Counter ---
function animateCounter(el, target, suffix = '') {
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.innerText = current + suffix;
        if (current >= target) clearInterval(timer);
    }, 30);
}

// --- App Initialization ---
async function initApp() {
    if (!authToken) {
        document.getElementById('auth-overlay').classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
        return;
    }
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');

    try {
        const meRes = await apiFetch('/auth/me');
        if (meRes.ok) {
            const me = await meRes.json();
            document.getElementById('user-greeting').innerText = `Greetings, ${me.username} 👋`;
        }
    } catch(e) {}

    await loadDashboard();
    if (window.lucide) lucide.createIcons();
}

async function startDemo() {
    document.getElementById('login-user').value = 'scholar_ansh';
    document.getElementById('login-pass').value = 'password123';
    document.getElementById('login-form').dispatchEvent(new Event('submit'));
}

// --- Focus Slider Live Update ---
document.getElementById('focus')?.addEventListener('input', (e) => {
    document.getElementById('focus-val').innerText = e.target.value;
});

// --- Session Logger ---
document.getElementById('log-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        subject: document.getElementById('subject').value,
        duration_minutes: parseInt(document.getElementById('duration').value),
        focus_rating: parseInt(document.getElementById('focus').value),
        notes: document.getElementById('notes').value || ''
    };
    try {
        const res = await apiFetch('/sessions/', { method: 'POST', body: JSON.stringify(payload) });
        if (res.ok) {
            showToast(`Session logged! +${payload.duration_minutes * 10} XP earned`, 'primary');
            document.getElementById('log-form').reset();
            document.getElementById('focus-val').innerText = '7';
            // Refresh dashboard stats
            loadDashboard();
            showSection('dashboard');
        } else {
            const err = await res.json();
            showToast(err.detail || 'Failed to log session', 'error');
        }
    } catch (err) {
        showToast('Network error saving session', 'error');
    }
});

// --- Dashboard & Analytics ---
async function loadDashboard() {
    try {
        const res = await apiFetch('/sessions/analysis');
        const data = await res.json();
        
        // Update Stats
        document.getElementById('prod-score').innerText = `${data.productivity_score}%`;
        
        // Animated streak counter
        const streakEl = document.getElementById('study-streak');
        animateCounter(streakEl, data.streak || 0, ' Days');
        
        // ML & Intelligence proof
        document.getElementById('prediction-count').innerText = `${data.prediction.predicted_daily_minutes || 0} min/day`;
        document.getElementById('prediction-trend').innerText = `Trend: ${data.prediction.trend_label || 'Calculating'}`;
        document.getElementById('streak-risk').innerText = data.streak_risk || 'N/A';
        
        // Update Level/XP
        document.getElementById('user-level').innerText = `LVL ${data.level}`;
        const xpPercent = (data.current_xp / data.next_level_xp_needed) * 100;
        document.getElementById('xp-fill').style.width = `${xpPercent}%`;
        document.getElementById('xp-text').innerText = `${data.current_xp} / ${data.next_level_xp_needed} XP`;
        
        // Diagnosis List (Intelligence Proof)
        const diagList = document.getElementById('diagnosis-list');
        if (data.weak_subjects && data.weak_subjects.length > 0) {
            diagList.innerHTML = data.weak_subjects.map(ws => `
                <div class="diagnosis-item">
                    <div style="font-weight:700; color: var(--accent);">${ws.subject} [${ws.severity}]</div>
                    <div style="font-size: 0.85rem; color: var(--primary-light);">${ws.reasoning}</div>
                </div>
            `).join('');
        } else {
            diagList.innerHTML = '<p class="subtitle">All neural patterns within optimal boundaries.</p>';
        }

        const sessionsRes = await apiFetch('/sessions/');
        const sessions = await sessionsRes.json();
        renderHeatmap(sessions);
        renderCharts(sessions);
        
        // Store for PDF
        window._dashData = data;
        window._sessions = sessions;
        
    } catch (err) {
        console.error(err);
    }
}

function renderHeatmap(sessions) {
    const container = document.getElementById('heatmap-container');
    if (!container) return;
    container.innerHTML = '';
    
    const today = new Date();
    const sessionDates = new Set(sessions.map(s => s.timestamp.split(' ')[0] || s.timestamp.split('T')[0]));
    
    // Create 15 weeks (105 cells)
    for (let i = 104; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        if (sessionDates.has(dateStr)) cell.classList.add('active');
        cell.title = dateStr;
        container.appendChild(cell);
    }
}

let distChart = null;
function renderCharts(sessions) {
    const ctx = document.getElementById('distributionChart')?.getContext('2d');
    if (!ctx) return;

    const subjects = {};
    sessions.forEach(s => {
        subjects[s.subject] = (subjects[s.subject] || 0) + s.duration_minutes;
    });

    if (distChart) distChart.destroy();
    distChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(subjects),
            datasets: [{
                data: Object.values(subjects),
                backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316'],
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8' } }
            }
        }
    });
}

// --- AI Chatbot ---
async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const query = input.value;
    if (!query) return;
    
    const messages = document.getElementById('chat-messages');
    messages.innerHTML += `<p class="user-msg"><strong>You:</strong> ${query}</p>`;
    input.value = '';

    try {
        const res = await apiFetch(`/chat?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        messages.innerHTML += `<p class="bot-msg"><strong>AI:</strong> ${data.response}</p>`;
        messages.scrollTop = messages.scrollHeight;
    } catch (err) {
        showToast("Chat engine offline", "error");
    }
}

// --- Roadmap & Wizard (Updated for Auth) ---
function wizardNext(step) {
    if (step === 1) {
        const count = parseInt(document.getElementById('subject-count').value);
        const container = document.getElementById('subject-inputs-container');
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            container.innerHTML += `<input type="text" class="wizard-sub-input" style="margin-bottom:10px;" placeholder="Subject ${i + 1}" required>`;
        }
        document.getElementById('step-1').classList.add('hidden');
        document.getElementById('step-2').classList.remove('hidden');
    } else if (step === 2) {
        document.getElementById('step-2').classList.add('hidden');
        document.getElementById('step-3').classList.remove('hidden');
        populateTimeSelects();
    }
}

function populateTimeSelects() {
    const start = document.getElementById('start-hour');
    const end = document.getElementById('end-hour');
    if (start.options.length > 0) return;
    for (let i = 0; i < 24; i++) {
        start.innerHTML += `<option value="${i}">${i}:00</option>`;
        end.innerHTML += `<option value="${i}">${i}:00</option>`;
    }
    start.value = 9; end.value = 17;
}

async function submitWizard() {
    const subjects = Array.from(document.querySelectorAll('.wizard-sub-input')).map(i => i.value).filter(v => v.trim() !== '');
    const start = parseInt(document.getElementById('start-hour').value);
    const end = parseInt(document.getElementById('end-hour').value);

    if (subjects.length === 0) { showToast('Please enter at least one subject', 'error'); return; }
    if (end <= start) { showToast('End time must be after start time', 'error'); return; }

    const res = await apiFetch('/roadmap/generate', {
        method: 'POST',
        body: JSON.stringify({ subjects, start_hour: start, end_hour: end })
    });
    const data = await res.json();

    const container = document.getElementById('roadmap-display');
    container.classList.remove('hidden');

    const rows = data.roadmap.map((slot, i) => {
        const isRest = slot.type === 'Rest';
        const rowBg = isRest
            ? 'background: rgba(30,41,59,0.6);'
            : (i % 4 === 0 ? 'background: rgba(99,102,241,0.06);' : 'background: rgba(15,23,42,0.4);');
        const badge = isRest
            ? `<span style="background:rgba(100,116,139,0.3);color:#94a3b8;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;border:1px solid rgba(148,163,184,0.2);">🌿 Rest</span>`
            : `<span style="background:rgba(99,102,241,0.25);color:#a5b4fc;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;border:1px solid rgba(99,102,241,0.3);">⚡ Study</span>`;
        return `<tr style="${rowBg} border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:14px 20px;font-weight:${isRest ? '500' : '700'};color:${isRest ? '#64748b' : '#f1f5f9'};font-size:0.95rem;">${slot.subject}</td>
            <td style="padding:14px 20px;color:#818cf8;font-weight:600;font-size:0.9rem;white-space:nowrap;">${slot.time_range}</td>
            <td style="padding:14px 20px;">${badge}</td>
            <td style="padding:14px 20px;color:#94a3b8;font-size:0.85rem;line-height:1.5;">${slot.tip}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;padding: 1.5rem 1.5rem 0;">
            <div>
                <h3 style="font-size:1.3rem;font-weight:700;color:#f1f5f9;">🧠 AI-Generated Study Timetable</h3>
                <p style="color:#64748b;font-size:0.85rem;margin-top:6px;">${data.viva_point || 'Based on Pomodoro method'}</p>
            </div>
            <span style="background:linear-gradient(135deg,#6366f1,#ec4899);padding:5px 16px;border-radius:20px;font-size:0.8rem;font-weight:700;color:white;white-space:nowrap;">AI Optimized</span>
        </div>
        <div style="overflow-x:auto;margin-top:1rem;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:rgba(99,102,241,0.15);border-bottom:2px solid rgba(99,102,241,0.3);">
                        <th style="padding:13px 20px;text-align:left;font-size:0.75rem;color:#818cf8;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Subject</th>
                        <th style="padding:13px 20px;text-align:left;font-size:0.75rem;color:#818cf8;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Time Slot</th>
                        <th style="padding:13px 20px;text-align:left;font-size:0.75rem;color:#818cf8;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">Type</th>
                        <th style="padding:13px 20px;text-align:left;font-size:0.75rem;color:#818cf8;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;">AI Tip</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;

}

// --- Dynamic Badge System ---
function renderBadges(data, sessionCount) {
    const ALL_BADGES = [
        { icon: '🚀', name: 'First Launch', desc: 'Logged your first session', unlocked: sessionCount >= 1 },
        { icon: '🔥', name: '7-Day Streak', desc: 'Study 7 days in a row', unlocked: (data?.streak || 0) >= 7 },
        { icon: '⚡', name: 'Focus Master', desc: 'Reach Level 5', unlocked: (data?.level || 1) >= 5 },
        { icon: '🏛️', name: 'Academic Legend', desc: 'Reach Level 10', unlocked: (data?.level || 1) >= 10 },
        { icon: '⚛️', name: 'Neural Pioneer', desc: 'Log 20+ sessions', unlocked: sessionCount >= 20 },
        { icon: '💎', name: 'Elite Scholar', desc: 'Earn 5000+ XP', unlocked: (data?.current_xp || 0) >= 5000 },
    ];
    const grid = document.getElementById('badge-grid');
    grid.innerHTML = ALL_BADGES.map(b => `
        <div class="card glass" style="text-align:center;padding:2rem;opacity:${b.unlocked ? '1' : '0.4'};transition:all 0.3s;">
            <div style="font-size:3rem;margin-bottom:0.8rem;filter:${b.unlocked ? 'none' : 'grayscale(1)'}">${b.icon}</div>
            <h3 style="margin-bottom:0.4rem;">${b.name}</h3>
            <p class="subtitle" style="font-size:0.8rem;">${b.desc}</p>
            <div style="margin-top:0.8rem;padding:3px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;display:inline-block;background:${b.unlocked ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'};color:${b.unlocked ? '#a5b4fc' : '#475569'};">
                ${b.unlocked ? '✓ UNLOCKED' : '🔒 LOCKED'}
            </div>
        </div>`).join('');
}

// --- PDF Export ---
async function exportPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) { showToast('PDF engine not loaded', 'error'); return; }
    
    showLoading();
    const data = window._dashData;
    const sessions = window._sessions || [];
    const username = document.getElementById('user-greeting').innerText.replace('Greetings, ', '').replace(' 👋', '');
    const date = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

    const doc = new jsPDF();
    const primary = [99, 102, 241];
    const accent = [244, 63, 94];

    // Header
    doc.setFillColor(...primary);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(22); doc.setFont('helvetica','bold');
    doc.text('NeuroStudy AI — Academic Report', 14, 18);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text(`Student: ${username}   |   Generated: ${date}`, 14, 30);

    // Stats Section
    doc.setTextColor(30,41,59);
    doc.setFontSize(14); doc.setFont('helvetica','bold');
    doc.text('Performance Overview', 14, 55);

    doc.setFontSize(11); doc.setFont('helvetica','normal');
    const stats = [
        ['Productivity Score', `${data?.productivity_score || 0}%`],
        ['Current Level', `LVL ${data?.level || 1}`],
        ['Total XP', `${data?.current_xp || 0} XP`],
        ['Total Sessions', `${sessions.length}`],
        ['Streak Risk', data?.streak_risk || 'N/A'],
        ['Predicted Study', `${data?.prediction?.predicted_daily_minutes || 0} min/day`],
    ];
    stats.forEach(([label, val], i) => {
        const y = 68 + (i * 10);
        doc.setFillColor(245,247,255);
        doc.rect(14, y - 5, 182, 9, 'F');
        doc.setTextColor(80,80,100); doc.text(label, 18, y);
        doc.setTextColor(...primary); doc.setFont('helvetica','bold');
        doc.text(val, 140, y);
        doc.setFont('helvetica','normal');
    });

    // Weak Subjects
    let y = 140;
    if (data?.weak_subjects?.length > 0) {
        doc.setTextColor(30,41,59);
        doc.setFontSize(14); doc.setFont('helvetica','bold');
        doc.text('AI Neural Diagnosis', 14, y); y += 10;
        data.weak_subjects.forEach(ws => {
            doc.setFillColor(255,245,245);
            doc.rect(14, y-5, 182, 16, 'F');
            doc.setTextColor(...accent); doc.setFontSize(11); doc.setFont('helvetica','bold');
            doc.text(`${ws.subject} [${ws.severity}]`, 18, y);
            doc.setTextColor(80,80,100); doc.setFontSize(9); doc.setFont('helvetica','normal');
            const lines = doc.splitTextToSize(ws.reasoning, 160);
            doc.text(lines, 18, y+6);
            y += 20;
        });
    }

    // ML Prediction
    y += 5;
    doc.setFillColor(...primary);
    doc.rect(0, y, 210, 25, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text('ML Prediction (Linear Regression)', 14, y+10);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    doc.text(data?.prediction?.reasoning || 'Insufficient data for projection.', 14, y+18);

    // Footer
    doc.setFontSize(8); doc.setTextColor(150,150,150);
    doc.text('NeuroStudy AI System — Powered by FastAPI + NumPy ML Engine', 14, 290);

    doc.save(`NeuroStudy_Report_${username}_${Date.now()}.pdf`);
    hideLoading();
    showToast('PDF Report exported successfully!', 'primary');
}

// --- UI Utility ---
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.remove('active'));
    if (id === 'dashboard') loadDashboard();
    if (id === 'gamification' && window._dashData) {
        renderBadges(window._dashData, (window._sessions || []).length);
    }
}

function showToast(msg, type) {
    const t = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    t.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Init Check
initApp();
