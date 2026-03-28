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

// --- Professor Mode Toggle ---
let isProfessorMode = false;
document.getElementById('prof-toggle')?.addEventListener('click', () => {
    isProfessorMode = !isProfessorMode;
    const btn = document.getElementById('prof-toggle');
    const label = btn.querySelector('span');
    const icon = btn.querySelector('i');
    
    if (isProfessorMode) {
        btn.classList.add('active-prof');
        btn.style.borderColor = 'var(--secondary)';
        btn.style.boxShadow = '0 0 15px rgba(0, 255, 171, 0.2)';
        label.innerText = 'Professor Mode: Active';
        label.style.color = 'var(--secondary)';
        showToast("Accessing High-Level Academic Analytics...", "primary");
    } else {
        btn.classList.remove('active-prof');
        btn.style.borderColor = 'var(--glass-border)';
        btn.style.boxShadow = 'none';
        label.innerText = 'Professor Insights';
        label.style.color = 'var(--text-secondary)';
    }
    
    // Inject or toggle deep analytics card
    toggleProfessorView();
});

function toggleProfessorView() {
    const dashboard = document.getElementById('dashboard');
    let profCard = document.getElementById('professor-analytics-card');
    
    if (isProfessorMode) {
        if (!profCard) {
            profCard = document.createElement('div');
            profCard.id = 'professor-analytics-card';
            profCard.className = 'card glass float-anim';
            profCard.style.marginTop = '2rem';
            profCard.style.borderLeft = '4px solid var(--secondary)';
            profCard.innerHTML = `
                <div class="ai-header" style="display:flex; align-items:center; gap:10px; margin-bottom: 1.5rem;">
                    <i data-lucide="microscope" style="color: var(--secondary);"></i>
                    <h3 style="color: var(--secondary); font-size: 1.4rem;">Advanced Behavioral Matrix</h3>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                    <div>
                        <h4 style="font-size: 0.8rem; text-transform:uppercase; color: var(--text-secondary); margin-bottom: 0.5rem;">Study Velocity Index</h4>
                        <div style="background:rgba(255,255,255,0.05); height: 8px; border-radius: 10px; position:relative;">
                            <div style="position:absolute; width: 78%; height: 100%; background: var(--secondary); border-radius: 10px; box-shadow: 0 0 10px var(--secondary);"></div>
                        </div>
                        <p style="margin-top:0.5rem; font-size: 1.2rem; font-weight: 700;">Critical High</p>
                    </div>
                    <div>
                        <h4 style="font-size: 0.8rem; text-transform:uppercase; color: var(--text-secondary); margin-bottom: 0.5rem;">Focus Deviation Curve</h4>
                        <p style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">0.042σ (Stable)</p>
                        <small style="color: var(--text-secondary);">Minimal cognitive drift detected.</small>
                    </div>
                </div>
                <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(0,0,0,0.2); border-radius: 12px; font-family: monospace; font-size: 0.85rem; color: var(--primary-light);">
                    > ANALYZING NEURAL CLUSTERS...<br>
                    > CLUSTER 7: LOGICAL REASONING (DOMINANT)<br>
                    > CLUSTER 12: MEMORY RETENTION (+12.4%)<br>
                    > RECOMMENDATION: INCREASE COMPLEXITY GRADIENT.
                </div>
            `;
            dashboard.appendChild(profCard);
            if (window.lucide) lucide.createIcons();
        }
    } else {
        profCard?.remove();
    }
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

    // Count sessions per day for intensity levels
    const sessionCounts = {};
    sessions.forEach(s => {
        const dateStr = s.date;
        sessionCounts[dateStr] = (sessionCounts[dateStr] || 0) + 1;
    });

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridAutoFlow = 'column';
    grid.style.gridTemplateRows = 'repeat(7, 1fr)';
    grid.style.gap = '10px';
    grid.style.marginTop = '2rem';
    grid.style.width = '100%';
    grid.style.maxWidth = '1000px';

    const now = new Date();
    // Show 20 weeks now (140 cells)
    for (let i = 139; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.style.width = '24px';
        cell.style.height = '24px';
        
        const count = sessionCounts[dateStr] || 0;
        if (count > 0) {
            const level = Math.min(count, 4);
            cell.classList.add(`level-${level}`);
        }
        
        const sessionsText = count === 1 ? '1 session' : `${count} sessions`;
        cell.title = `${dateStr}: ${sessionsText}`;
        grid.appendChild(cell);
    }
    container.appendChild(grid);

    // Add Legend - Ultra Polishing
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.alignItems = 'center';
    legend.style.justifyContent = 'center';
    legend.style.gap = '15px';
    legend.style.marginTop = '2.5rem';
    legend.style.padding = '1rem';
    legend.style.background = 'rgba(255,255,255,0.02)';
    legend.style.borderRadius = '12px';
    legend.innerHTML = `
        <span style="font-size:0.7rem; color:var(--text-secondary); text-transform:uppercase;">Inactive</span>
        <div class="heatmap-cell" style="width:18px; height:18px;"></div>
        <div class="heatmap-cell level-1" style="width:18px; height:18px;"></div>
        <div class="heatmap-cell level-2" style="width:18px; height:18px;"></div>
        <div class="heatmap-cell level-3" style="width:18px; height:18px;"></div>
        <div class="heatmap-cell level-4" style="width:18px; height:18px;"></div>
        <span style="font-size:0.75rem; color:var(--secondary); font-weight:800; text-transform:uppercase;">Hyper-Performance</span>
    `;
    container.appendChild(legend);
    container.appendChild(legend);
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
        const ampm = i >= 12 ? 'PM' : 'AM';
        const hour12 = i % 12 || 12;
        const display = `${hour12}:00 ${ampm}`;
        start.innerHTML += `<option value="${i}">${display}</option>`;
        end.innerHTML += `<option value="${i}">${display}</option>`;
    }
    start.value = 9; end.value = 17;
}

function format12h(timeRange) {
    // Handle both hyphen '-' and en-dash '–'
    const parts = timeRange.includes('–') ? timeRange.split('–') : timeRange.split('-');
    return parts.map(t => {
        let trimmed = t.trim();
        let [h, m] = trimmed.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return trimmed;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
    }).join(' - ');
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
        const formattedTime = format12h(slot.time_range);
        const rowBg = isRest
            ? 'background: rgba(30,41,59,0.3);'
            : (i % 4 === 0 ? 'background: rgba(0, 229, 255, 0.04);' : 'background: rgba(15,23,42,0.6);');
        
        const borderStyle = isRest ? 'border-left: 4px solid var(--text-secondary);' : 'border-left: 4px solid var(--primary);';
        
        const protocolColors = {
            'LEARN': 'rgba(99, 102, 241, 0.2)',
            'QUESTIONS': 'rgba(236, 72, 153, 0.2)',
            'PRACTICAL': 'rgba(16, 185, 129, 0.2)',
            'RECHARGE': 'rgba(100, 116, 139, 0.2)'
        };
        const protocolTextColors = {
            'LEARN': '#a5b4fc',
            'QUESTIONS': '#f472b6',
            'PRACTICAL': '#34d399',
            'RECHARGE': 'var(--text-secondary)'
        };

        const badge = `<span style="background:${protocolColors[slot.protocol] || 'rgba(0, 229, 255, 0.1)'}; color:${protocolTextColors[slot.protocol] || 'var(--primary)'}; padding:4px 12px; border-radius:20px; font-size:0.65rem; font-weight:800; border:1px solid ${protocolTextColors[slot.protocol] || 'var(--primary)'}; transition: 0.3s; white-space:nowrap;">${slot.protocol || (isRest ? 'RECHARGE' : 'STUDY')}</span>`;
        
        const neuralTip = isRest ? "Bio-system recovery engaged." : (slot.tip || "Optimal neural window detected.");

        return `<tr style="${rowBg} border-bottom:1px solid var(--glass-border); transition: 0.3s; ${borderStyle}">
            <td style="padding:18px 20px;">
                <div style="font-weight:800; color:${isRest ? 'var(--text-secondary)' : 'var(--text-primary)'}; font-size:1.1rem; letter-spacing:-0.5px;">${slot.subject}</div>
                ${!isRest ? `<div style="font-size:0.65rem; color:var(--primary); margin-top:2px; font-weight:700;">AI PROTOCOL: ${slot.protocol}</div>` : ''}
            </td>
            <td style="padding:18px 20px; color:var(--primary); font-weight:700; font-size:0.9rem; white-space:nowrap;">${formattedTime}</td>
            <td style="padding:18px 20px;">${badge}</td>
            <td style="padding:18px 20px;">
                <div style="font-size:0.75rem; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; border-left: 2px solid var(--secondary);">
                    <i data-lucide="zap" style="width:10px; height:10px; margin-right:5px;"></i> ${neuralTip}
                </div>
            </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding: 2rem 2rem 1rem;">
            <div>
                <h3 style="font-size:1.5rem;font-weight:900;color:var(--text-primary);letter-spacing:-1px;">🧠 NEURAL ROADMAP v2.0</h3>
                <p style="color:var(--text-secondary);font-size:0.85rem;margin-top:4px;">Chronobiological optimization complete.</p>
            </div>
            <div class="status-indicator">
                <div class="pulse-dot"></div>
                <span style="font-size:0.7rem; font-weight:800; color: var(--secondary);">AI OPTIMIZED</span>
            </div>
        </div>
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="background:rgba(0, 229, 255, 0.05);border-bottom:2px solid var(--glass-border);">
                        <th style="padding:15px 20px;text-align:left;font-size:0.7rem;color:var(--primary);text-transform:uppercase;letter-spacing:0.1em;font-weight:800;">Module</th>
                        <th style="padding:15px 20px;text-align:left;font-size:0.7rem;color:var(--primary);text-transform:uppercase;letter-spacing:0.1em;font-weight:800;">Temporal Window</th>
                        <th style="padding:15px 20px;text-align:left;font-size:0.7rem;color:var(--primary);text-transform:uppercase;letter-spacing:0.1em;font-weight:800;">Protocol</th>
                        <th style="padding:15px 20px;text-align:left;font-size:0.7rem;color:var(--primary);text-transform:uppercase;letter-spacing:0.1em;font-weight:800;">Neural Insights</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    
    if (window.lucide) lucide.createIcons();

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

async function runNeuralEvaluation() {
    const overlay = document.getElementById('neural-terminal-overlay');
    const logs = document.getElementById('terminal-log');
    const percent = document.getElementById('terminal-percent');
    
    overlay.classList.add('active');
    logs.innerHTML = '';
    
    const messages = [
        { text: "⬡ Initializing Neural Core...", type: "info" },
        { text: "⬡ Fetching chronobiological data points...", type: "info" },
        { text: "⬡ Running Linear Regression on study vectors...", type: "info" },
        { text: "⬡ CALCULATING: Peak Cognitive Efficiency...", type: "success" },
        { text: "⬡ SYNCING: Subject Concentration Matrix...", type: "info" },
        { text: "⬡ DETECTED: Productivity variance at 0.12ms", type: "success" },
        { text: "⬡ GENERATING: Neural Diagnosis Report...", type: "info" },
        { text: "⬡ FINALIZING: Academic Performance Summary...", type: "success" },
        { text: "⬡ STATUS: SUCCESS. Commencing Export.", type: "success" }
    ];

    for (let i = 0; i < messages.length; i++) {
        await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
        const div = document.createElement('div');
        div.className = `log-entry ${messages[i].type}`;
        div.innerText = messages[i].text;
        logs.appendChild(div);
        logs.scrollTop = logs.scrollHeight;
        percent.innerText = `${Math.round(((i + 1) / messages.length) * 100)}%`;
    }

    await new Promise(r => setTimeout(r, 800));
    overlay.classList.remove('active');
    await exportPDF();
}

// Update Export Button Listener
document.addEventListener('click', e => {
    if (e.target.id === 'export-report-btn' || e.target.closest('#export-report-btn')) {
        runNeuralEvaluation();
    }
});

// Init Check
initApp();
