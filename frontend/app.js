const API_URL = "http://127.0.0.1:8000/api";
let authToken = localStorage.getItem('token');
let currentDashData = null;

// --- CORE UTILS ---
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

function showToast(msg, type) {
    // If there's no toast-container, wait or skip (for demo simplicity, avoiding crash)
    alert(`[${type.toUpperCase()}] ${msg}`);
}

function animateCounter(el, target, suffix = '') {
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.innerText = current + suffix;
        if (current >= target) clearInterval(timer);
    }, 20);
}

// --- AUTH ---
function logout() {
    localStorage.removeItem('token');
    location.reload();
}

async function initApp() {
    if (!authToken) {
        // Mock auth for this local project if no token
        // In a real flow, you'd show a login screen
        try {
            const loginRes = await fetch("http://127.0.0.1:8000/api/login", {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: "username=testuser&password=testpassword"
            });
            if(loginRes.ok) {
                const data = await loginRes.json();
                authToken = data.access_token;
                localStorage.setItem('token', authToken);
            }
        } catch(e) { console.log(e); }
    }
    
    setTimeout(() => {
        loadDashboard();
    }, 100);
}

// --- NAVIGATION ---
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(li => li.classList.remove('active'));
    document.querySelector(`.nav-item[onclick*="${id}"]`)?.classList.add('active');

    if (id === 'dashboard') loadDashboard();
    if (id === 'analytics') loadAnalytics();
    if (id === 'roadmap') loadRoadmap();
    if (id === 'logger') loadLogger();
}

// --- VIEW CONTROLLERS ---

// DASHBOARD
async function loadDashboard() {
    try {
        const suggRes = await apiFetch('/sessions/suggestions');
        const suggestions = await suggRes.json();
        const container = document.getElementById('suggestion-container');
        if(container && Array.isArray(suggestions)) {
            container.innerHTML = suggestions.map(s => `
                <div class="card suggestion-card">
                    <span class="impact-badge mono">${s.impact}</span>
                    <div class="card-title mono cyan">${s.title}</div>
                    <p style="font-size:0.9rem; margin-bottom:10px;">${s.insight}</p>
                    <div style="font-size:0.8rem; color:var(--text-muted);">
                        <span class="dot dot-success"></span> ACTION: ${s.action}
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error("Dashboard Load Error:", e); }
}

// ANALYTICS HUB
async function loadAnalytics() {
    try {
        const oRes = await apiFetch('/analytics/overview');
        const overview = await oRes.json();
        document.getElementById('analytics-overview').innerHTML = `
            <div class="card">
                <div style="font-size:0.7rem; color:#94A3B8;">PRODUCTIVITY_SCORE</div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="card-value mono" style="font-size:2rem; font-weight:800; margin-top:5px;">${overview.score}%</div>
                    <div class="${overview.score >= overview.prev_score ? 'emerald' : 'danger'} mono" style="font-size:1.2rem;">${overview.score >= overview.prev_score ? '▲' : '▼'}</div>
                </div>
                <div style="width:80px; height:80px; border-radius:50%; background:conic-gradient(var(--primary) ${overview.score}%, transparent 0); display:flex; align-items:center; justify-content:center; margin:10px auto;">
                    <div style="width:60px; height:60px; background:var(--bg-card); border-radius:50%;"></div>
                </div>
            </div>
            <div class="card">
                <div style="font-size:0.7rem; color:#94A3B8;">STUDY_HOURS</div>
                <div class="card-value mono" style="font-size:2rem; font-weight:800; margin-top:5px;">${overview.this_month_hrs}</div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:10px;">vs ${overview.last_month_hrs} last month</div>
            </div>
        `;

        const hmRes = await apiFetch('/analytics/heatmap');
        const hmData = await hmRes.json();
        const hmGrid = document.getElementById('focus-heatmap');
        hmGrid.style.display = 'grid';
        hmGrid.style.gridTemplateColumns = 'repeat(24, 1fr)';
        hmGrid.style.gap = '2px';
        hmGrid.innerHTML = '';
        for (let c of hmData.grid) {
            let opacity = c.focus === 0 ? 0.05 : c.focus < 4 ? 0.3 : c.focus < 8 ? 0.6 : 1;
            hmGrid.innerHTML += `<div class="heatmap-cell" title="Day ${c.day}, Hour ${c.hour}: Focus ${c.focus} - ${c.subject}" style="aspect-ratio:1; background:var(--primary); opacity:${opacity}; border-radius:2px;"></div>`;
        }

        const subRes = await apiFetch('/analytics/subjects');
        const subjects = await subRes.json();
        document.getElementById('subject-health-list').innerHTML = subjects.map(s => `
            <div style="margin-bottom:15px; border:1px solid rgba(255,255,255,0.1); padding:10px; border-radius:4px;">
                <div style="display:flex; justify-content:space-between;" class="mono text-sm">
                    <span style="color:var(--primary);">${s.subject}</span>
                    <span class="${s.health === 'OPTIMAL' ? 'emerald' : s.health === 'REVIEW' ? 'amber' : 'danger'}">${s.health}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                    <div style="flex:1; background:var(--bg-deep); height:8px; border-radius:4px;">
                        <div style="background:var(--primary); width:${Math.min(100, (s.hours/10)*100)}%; height:100%; border-radius:4px;"></div>
                    </div>
                    <span class="mono text-xs">${s.hours}h</span>
                </div>
                <div class="mono" style="font-size:0.6rem; margin-top:5px; color:#94A3B8;">FOCUS: ${s.avg_focus}/10 | IDLE: ${s.days_ago} DAYS</div>
            </div>
        `).join('');

        const strRes = await apiFetch('/analytics/streak');
        const streakData = await strRes.json();
        document.getElementById('streak-stats').innerHTML = `
            <span>CURRENT_STREAK: <span class="emerald">${streakData.current_streak}</span></span>
            <span>LONGEST_STREAK: <span class="cyan">${streakData.longest_streak}</span></span>
        `;
        const strGrid = document.getElementById('streak-calendar');
        strGrid.style.display = 'flex';
        strGrid.style.flexWrap = 'wrap';
        strGrid.style.gap = '2px';
        strGrid.innerHTML = streakData.grid.map(g => `<div style="width:12px; height:12px; background:${g.studied ? 'var(--success)' : 'rgba(255,255,255,0.05)'}; border-radius:2px;" title="Day ${g.day_idx}"></div>`).join('');
        document.getElementById('freeze-btn').innerText = `USE FREEZE TOKEN (${streakData.freeze_tokens})`;

        const tlRes = await apiFetch('/analytics/timeline');
        const timeline = await tlRes.json();
        document.getElementById('insights-timeline').innerHTML = timeline.events.map(e => `
            <div style="position:relative; margin-bottom:20px;">
                <div style="position:absolute; left:-25px; top:5px; width:10px; height:10px; background:var(--primary); border-radius:50%;"></div>
                <div class="mono text-xs" style="color:#94A3B8;">${e.date}</div>
                <div class="mono" style="font-size:0.9rem;">${e.text}</div>
                <div class="mono emerald text-xs">+${e.xp} XP</div>
            </div>
        `).join('');

    } catch(e) { console.error("Analytics Load Error", e); }
}

async function useFreezeToken() {
    const res = await apiFetch('/roadmap/redeem-token', { method: 'POST' });
    if(res.ok) { showToast("Freeze Token Applied", "success"); loadAnalytics(); }
    else { const e = await res.json(); showToast(e.detail || "Error", "warning"); }
}

// STUDY ARCHITECT
async function generateRoadmap(e) {
    if(e) e.preventDefault();
    const subjectsRaw = document.getElementById('rm-subjects').value;
    const days = parseInt(document.getElementById('rm-days').value);
    
    const subjects = subjectsRaw.split(',').map(s => ({ subject: s.trim(), priority: 2 }));
    
    try {
        const res = await apiFetch('/roadmap/generate', {
            method: 'POST',
            body: JSON.stringify({ subjects, days, start_hour: 9, end_hour: 21 }) // Include dummy hours required by schema 
        });
        if(res.ok) {
            showToast("Roadmap Generated", "success");
            loadRoadmap();
        }
    } catch(e) { console.error(e); }
}

async function loadRoadmap() {
    try {
        const res = await apiFetch('/roadmap/');
        const data = await res.json();
        
        const hRes = await apiFetch('/roadmap/health');
        const health = await hRes.json();
        
        document.getElementById('roadmap-health-badge').innerText = health.status;
        document.getElementById('roadmap-health-badge').className = `badge ${health.status === 'ON_TRACK' ? 'emerald' : health.status === 'AT_RISK' ? 'danger' : 'amber'}`;
        
        document.getElementById('exam-countdown').innerHTML = `
            <div>
                <div style="font-size:0.7rem; color:#94A3B8;" class="mono">COMPLETION</div>
                <div class="mono" style="font-size:1.5rem;">${health.completion_percent}%</div>
            </div>
            <div class="mono text-sm" style="color:var(--text-muted);">
                ${health.status === 'ON_TRACK' ? "NEURAL_SYNC: OPTIMAL" : health.status === 'AT_RISK' ? "WARNING: ACCELERATION REQUIRED" : "PROCESSING: STAY CONSISTENT"}
            </div>
        `;
        
        if (data.slots && data.slots.length > 0) {
            const container = document.getElementById('gantt-chart');
            const days = [...new Set(data.slots.map(s => s.day_index))];
            
            let html = ``;
            days.forEach(d => {
                const daySlots = data.slots.filter(s => s.day_index === d);
                html += `<div style="background:var(--bg-deep); padding:10px; border-left:2px solid var(--primary); margin-bottom:5px;">
                    <div class="mono text-xs" style="color:#94A3B8; margin-bottom:10px;">DAY ${d+1}</div>
                    <div style="display:flex; gap:10px; overflow-x:auto;">
                `;
                daySlots.forEach(s => {
                    let color = s.is_completed === 1 ? 'var(--success)' : s.is_completed === -1 ? 'var(--warning)' : 'var(--primary)';
                    html += `
                        <div onclick="updateSlotState(${s.id}, ${s.is_completed})" style="cursor:pointer; flex: 0 0 200px; background:var(--bg-card); border:1px solid ${color}; padding:10px; border-radius:4px;">
                            <div class="mono text-xs cyan">${s.time_block.toUpperCase()}</div>
                            <div class="mono">${s.subject}</div>
                            <div class="mono text-xs" style="color:#94A3B8;">${s.duration_minutes}m • ${s.protocol}</div>
                            <div class="mono text-xs" style="margin-top:5px; color:${color};">${s.is_completed === 1 ? 'COMPLETED ✓' : s.is_completed === -1 ? 'SKIPPED' : 'PENDING'}</div>
                        </div>
                    `;
                });
                html += `</div></div>`;
            });
            container.innerHTML = html;
        } else {
             document.getElementById('gantt-chart').innerHTML = `<div class="card mono" style="text-align:center;">NO_DATA_FOUND // Generate a roadmap to begin</div>`;
        }
    } catch(e) { console.error(e); }
}

async function updateSlotState(id, current_state) {
    let next_state = current_state === 0 ? 'COMPLETE' : current_state === 1 ? 'SKIP' : 'PENDING';
    const res = await apiFetch(`/roadmap/session/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next_state })
    });
    if(res.ok) loadRoadmap();
}

async function rescheduleRoadmap() {
    const res = await apiFetch('/roadmap/reschedule', { method: 'POST' });
    if(res.ok) {
        const data = await res.json();
        showToast(data.message, "primary");
        loadRoadmap();
    }
}

// NEURAL LOG
async function loadLogger() {
    try {
        const sRes = await apiFetch('/sessions/');
        const sessions = await sRes.json();
        
        const tbody = document.getElementById('session-table-body');
        tbody.innerHTML = sessions.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).reverse().map(s => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td class="mono text-sm" style="padding:10px;">${new Date(s.timestamp).toLocaleDateString()}</td>
                <td class="mono" style="padding:10px;">${s.subject}</td>
                <td class="mono text-sm" style="padding:10px;">${s.duration_minutes}m</td>
                <td class="mono text-sm ${s.focus_rating >= 8 ? 'emerald' : s.focus_rating < 5 ? 'danger' : 'amber'}" style="padding:10px;">${s.focus_rating}/10</td>
                <td style="padding:10px;">
                    <button class="mono cyan" style="background:none; border:none; cursor:pointer;" onclick="deleteSession(${s.id})">DEL</button>
                </td>
            </tr>
        `).join('');

        const bRes = await apiFetch('/sessions/badges');
        const badges = await bRes.json();
        document.getElementById('badges-grid').innerHTML = badges.map(b => `
            <div style="background:var(--bg-card); padding:15px; border-radius:4px; border:1px solid ${b.unlocked ? 'var(--primary)' : 'rgba(255,255,255,0.05)'}; opacity:${b.unlocked ? '1' : '0.5'}; display:flex; gap:10px; align-items:center;">
                <div style="font-size:2rem;">${b.icon}</div>
                <div>
                    <div class="mono text-sm" style="color:${b.unlocked ? 'var(--primary)' : '#94A3B8'};">${b.name}</div>
                    <div class="mono text-xs" style="color:#94A3B8;">${b.desc}</div>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

function updateFocusLabel(val) {
    const lbl = document.getElementById('focus-label');
    const v = parseInt(val);
    if(v <= 3) lbl.innerText = "DISTRACTED";
    else if(v <= 6) lbl.innerText = "FOCUSED";
    else if(v <= 8) lbl.innerText = "DEEP_FOCUS";
    else lbl.innerText = "FLOW_STATE";
}

async function logSession(e) {
    if(e) e.preventDefault();
    const payload = {
        subject: document.getElementById('log-subject').value,
        duration_minutes: parseInt(document.getElementById('log-duration').value),
        focus_rating: parseInt(document.getElementById('log-focus').value),
        notes: document.getElementById('log-notes').value
    };
    
    try {
        const res = await apiFetch('/sessions/', { method: 'POST', body: JSON.stringify(payload) });
        if(res.ok) {
            showToast("SESSION_LOGGED // +XP EARNED", "success");
            document.getElementById('log-form').reset();
            loadLogger();
        }
    } catch(e) { console.error(e); }
}

async function startVoiceLogger() {
    const status = document.getElementById('voice-status');
    status.style.display = 'block';
    
    if (!('webkitSpeechRecognition' in window)) {
        status.innerText = "Browser does not support Speech Recognition.";
        setTimeout(() => status.style.display='none', 3000);
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
        status.innerText = "LISTENING...";
    };
    
    recognition.onresult = async function(event) {
        status.innerText = "PROCESSING...";
        const text = event.results[0][0].transcript;
        
        try {
            const res = await apiFetch('/sessions/voice-parse', {
                method: 'POST',
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                const data = await res.json();
                document.getElementById('log-subject').value = data.subject;
                document.getElementById('log-duration').value = data.duration_minutes;
                document.getElementById('log-focus').value = data.focus_rating;
                updateFocusLabel(data.focus_rating);
                status.innerText = "LOGGED ✓ AUTO-FILLED";
                setTimeout(() => status.style.display='none', 3000);
            }
        } catch(e) {
            status.innerText = "PROCESSINGFAILED";
            setTimeout(() => status.style.display='none', 3000);
        }
    };
    
    recognition.onerror = function(event) {
        status.innerText = "ERROR LISTENING";
        setTimeout(() => status.style.display='none', 3000);
    };
    
    recognition.start();
}

async function deleteSession(id) {
    const res = await apiFetch(`/sessions/${id}`, { method: 'DELETE' });
    if(res.ok) {
        showToast("Session Removed", "primary");
        loadLogger();
    }
}

// Ensure init matches exactly
window.addEventListener('DOMContentLoaded', () => {
    initApp();
});
