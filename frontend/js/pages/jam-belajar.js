const session = MyStatsUAuth.requireAuth();
const userId = session.user.mahasiswaID || session.user.id;
const dayLabels = ['SEN','SEL','RAB','KAM','JUM','SAB','MIN'];
const colors = ['#CC0000', '#2563EB', '#16A34A', '#D97706', '#7C3AED', '#0891B2'];
const jamState = {
    data: [],
    period: 'week',
    showAllSessions: false
};

function targetKey(period) {
    return `mystatsuStudyTarget:${userId}:${period}`;
}

function getStudyTarget(period) {
    const defaultTarget = period === 'month' ? 120 : 30;
    const value = Number(localStorage.getItem(targetKey(period)));
    return Number.isFinite(value) && value > 0 ? value : defaultTarget;
}

function setStudyTarget(period, value) {
    localStorage.setItem(targetKey(period), String(value));
}

function hydrateTargetInputs() {
    const week = document.getElementById('targetWeek');
    const month = document.getElementById('targetMonth');
    if (week) week.value = getStudyTarget('week');
    if (month) month.value = getStudyTarget('month');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
    }[char]));
}

function ensureToastUi() {
    if (!document.getElementById('toastStack')) {
        document.body.insertAdjacentHTML('beforeend', '<div class="toast-stack" id="toastStack" aria-live="polite" aria-atomic="true"></div>');
    }
}

function showToast(message, type = 'success', title) {
    ensureToastUi();

    const stack = document.getElementById('toastStack');
    const toast = document.createElement('div');
    const icon = type === 'success'
        ? '<path d="M20 6 9 17l-5-5"/>'
        : type === 'info'
            ? '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
            : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';

    toast.className = `app-toast ${type}`;
    toast.innerHTML = `
        <div class="toast-ico"><svg viewBox="0 0 24 24">${icon}</svg></div>
        <div>
            <div class="toast-title">${escapeHtml(title || (type === 'success' ? 'Berhasil' : type === 'info' ? 'Detail belajar' : 'Perlu dicek'))}</div>
            <div class="toast-msg">${escapeHtml(message)}</div>
        </div>
    `;
    stack.appendChild(toast);

    window.setTimeout(() => {
        toast.style.animation = 'toastOut .2s ease forwards';
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 2800);
}

function todayInputValue() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
}

function parseDateOnly(value) {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function startOfWeek(date) {
    const start = new Date(date);
    const dayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOffset);
    start.setHours(0, 0, 0, 0);
    return start;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInCurrentWeek(date) {
    if (!date) return false;
    const start = startOfWeek(new Date());
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return date >= start && date < end;
}

function isInCurrentMonth(date) {
    if (!date) return false;
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

function dayIndexInWeek(date, weekStart) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return Math.round((copy - weekStart) / 86400000);
}

function sumDurasi(data) {
    return data.reduce((total, item) => total + (Number(item.durasi) || 0), 0);
}

function minutesToHours(minutes) {
    return (Number(minutes) || 0) / 60;
}

function formatHours(hours) {
    return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

async function apiJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: MyStatsUAuth.authHeaders(options.headers || {})
    });

    if (response.status === 401 || response.status === 403) {
        MyStatsUAuth.logout();
        return null;
    }

    if (!response.ok) throw new Error(`Request gagal: ${response.status}`);
    return response.json();
}

function currentPeriodData() {
    return jamState.data.filter(item => {
        const date = parseDateOnly(item.tanggal);
        return jamState.period === 'month' ? isInCurrentMonth(date) : isInCurrentWeek(date);
    });
}

function renderWeekChart(jamData) {
    const weekTotals = Array(7).fill(0);
    const weekStart = startOfWeek(new Date());

    jamData.forEach(item => {
        const date = parseDateOnly(item.tanggal);
        if (!date) return;
        const index = dayIndexInWeek(date, weekStart);
        if (index >= 0 && index < 7) weekTotals[index] += minutesToHours(item.durasi);
    });

    const max = Math.max(6, ...weekTotals);
    const todayIndex = dayIndexInWeek(new Date(), weekStart);

    document.querySelectorAll('.wday-col').forEach((col, index) => {
        const total = weekTotals[index];
        const bar = col.querySelector('.wday-bar');
        const meta = col.querySelector('.wday-meta');
        const tooltip = col.querySelector('.bar-tooltip');
        const value = col.querySelector('.wday-val');
        const label = col.querySelector('.wday-lbl');

        if (!bar || !value || !label) return;

        const height = total ? Math.max(8, Math.round((total / max) * 100)) : 5;
        bar.style.height = `${height}%`;
        bar.className = 'wday-bar ' + (index === todayIndex ? 'today' : total >= 4 ? 'active' : total > 0 ? 'mid' : 'low');

        if (meta) meta.classList.toggle('today-meta', index === todayIndex);
        if (tooltip) tooltip.textContent = `${formatHours(total)} jam`;
        value.textContent = `${formatHours(total)}j`;
        label.textContent = dayLabels[index];
    });

    const weeklyTotal = weekTotals.reduce((total, item) => total + item, 0);
    const target = getStudyTarget('week');
    const progress = Math.min(100, Math.round((weeklyTotal / target) * 100));
    const targetVal = document.querySelector('.target-val');
    const progressFill = document.querySelector('.progress-fill');

    if (targetVal) targetVal.textContent = `${formatHours(weeklyTotal)}j / ${target}j`;
    if (progressFill) progressFill.style.width = `${progress}%`;

    return { weeklyTotal, average: weeklyTotal / 7, target };
}

function renderMonthChart(jamData) {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const weeks = [0, 0, 0, 0, 0];

    jamData.forEach(item => {
        const date = parseDateOnly(item.tanggal);
        if (!date || date < monthStart || date > monthEnd) return;
        const weekIndex = Math.min(4, Math.floor((date.getDate() - 1) / 7));
        weeks[weekIndex] += minutesToHours(item.durasi);
    });

    const max = Math.max(12, ...weeks);
    document.querySelectorAll('.wday-col').forEach((col, index) => {
        const total = weeks[index] || 0;
        const bar = col.querySelector('.wday-bar');
        const meta = col.querySelector('.wday-meta');
        const tooltip = col.querySelector('.bar-tooltip');
        const value = col.querySelector('.wday-val');
        const label = col.querySelector('.wday-lbl');

        if (!bar || !value || !label) return;

        if (index >= 5) {
            bar.style.height = '5%';
            bar.className = 'wday-bar low';
            value.textContent = '-';
            label.textContent = '';
            if (tooltip) tooltip.textContent = 'Tidak dipakai';
            if (meta) meta.classList.remove('today-meta');
            return;
        }

        const height = total ? Math.max(8, Math.round((total / max) * 100)) : 5;
        bar.style.height = `${height}%`;
        bar.className = 'wday-bar ' + (total >= 10 ? 'active' : total > 0 ? 'mid' : 'low');
        value.textContent = `${formatHours(total)}j`;
        label.textContent = `M${index + 1}`;
        if (tooltip) tooltip.textContent = `${formatHours(total)} jam`;
        if (meta) meta.classList.toggle('today-meta', Math.floor((today.getDate() - 1) / 7) === index);
    });

    const monthlyTotal = weeks.reduce((total, item) => total + item, 0);
    const target = getStudyTarget('month');
    const progress = Math.min(100, Math.round((monthlyTotal / target) * 100));
    const targetVal = document.querySelector('.target-val');
    const progressFill = document.querySelector('.progress-fill');

    if (targetVal) targetVal.textContent = `${formatHours(monthlyTotal)}j / ${target}j`;
    if (progressFill) progressFill.style.width = `${progress}%`;

    return { total: monthlyTotal, average: monthlyTotal / today.getDate(), target };
}

function renderSessions(jamData) {
    const list = document.getElementById('sessionList');
    const source = jamState.showAllSessions ? jamState.data : jamData.filter(item => isSameDay(parseDateOnly(item.tanggal), new Date()));

    if (!source.length) {
        list.innerHTML = `
            <div style="text-align:center;color:var(--muted);padding:24px 12px;font-weight:600;">
                ${jamState.showAllSessions ? 'Belum ada sesi belajar.' : 'Belum ada sesi hari ini. Klik Semua Sesi untuk melihat riwayat.'}
            </div>
        `;
        return;
    }

    const sorted = [...source].sort((a, b) => String(b.tanggal || '').localeCompare(String(a.tanggal || ''))).slice(0, jamState.showAllSessions ? 50 : 8);

    list.innerHTML = sorted.map((item, index) => `
        <div class="session-item">
            <div class="session-dot" style="background:${colors[index % colors.length]}"></div>
            <div class="session-info">
                <div class="session-mk">${escapeHtml(item.mata_kuliah || '-')}</div>
                <div class="session-time">${escapeHtml(item.tanggal || '-')} · ${escapeHtml(item.catatan || 'Data input')}</div>
            </div>
            <div class="session-dur">${escapeHtml(formatHours(minutesToHours(item.durasi)))}<span>j</span></div>
        </div>
    `).join('');
}

function renderBreakdown(jamData) {
    const container = document.getElementById('mkBreakdown');
    const totals = new Map();

    jamData.forEach(item => {
        const key = item.mata_kuliah || 'Tanpa nama';
        totals.set(key, (totals.get(key) || 0) + minutesToHours(item.durasi));
    });

    const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const max = Math.max(1, ...entries.map(([, total]) => total));

    if (!entries.length) {
        container.innerHTML = `
            <div style="color:var(--muted);font-size:12px;font-weight:600;">
                Belum ada data per mata kuliah.
            </div>
        `;
        return;
    }

    container.innerHTML = entries.map(([name, total], index) => `
        <div class="mk-bar-item">
            <div class="mk-bar-top"><span class="mk-bar-name">${escapeHtml(name)}</span><span class="mk-bar-val">${formatHours(total)}j</span></div>
            <div class="mk-track"><div class="mk-fill" style="width:${Math.round((total / max) * 100)}%;background:${colors[index % colors.length]}"></div></div>
        </div>
    `).join('');
}

function renderHeatmap(jamData) {
    const grid = document.querySelector('.heatmap-grid');
    if (!grid) return;

    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const totals = new Map();

    jamData.forEach(item => {
        const date = parseDateOnly(item.tanggal);
        if (!date || date < monthStart || date > monthEnd) return;
        const key = item.tanggal;
        totals.set(key, (totals.get(key) || 0) + minutesToHours(item.durasi));
    });

    const cells = [];
    for (let day = 1; day <= monthEnd.getDate(); day++) {
        const date = new Date(today.getFullYear(), today.getMonth(), day);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const total = totals.get(key) || 0;
        const level = total >= 4 ? 'l4' : total >= 2 ? 'l3' : total > 0 ? 'l2' : '';
        cells.push(`<button type="button" class="heat-cell ${level} ${isSameDay(date, today) ? 'today-cell' : ''}" title="${key}: ${formatHours(total)} jam" data-heat-date="${key}" data-heat-hours="${formatHours(total)}"></button>`);
    }
    grid.innerHTML = cells.join('');
    grid.querySelectorAll('.heat-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            showToast(`${cell.dataset.heatDate}: ${cell.dataset.heatHours} jam belajar`, 'info');
        });
    });
}

async function loadJamBelajar() {
    try {
        const jamData = await apiJson(`/api/jam/${userId}`);
        if (!jamData) return;
        jamState.data = Array.isArray(jamData) ? jamData : [];
        const periodData = currentPeriodData();
        const summary = jamState.period === 'month' ? renderMonthChart(jamState.data) : renderWeekChart(jamState.data);

        renderSessions(periodData);
        renderBreakdown(periodData);
        renderHeatmap(jamState.data);

        const statValues = document.querySelectorAll('.stat-grid .stat-value');
        const total = jamState.period === 'month' ? summary.total : summary.weeklyTotal;
        const target = summary.target;
        if (statValues[0]) statValues[0].innerHTML = `${formatHours(total)}<span style="font-size:16px;letter-spacing:0">j</span>`;
        if (statValues[1]) statValues[1].innerHTML = `${summary.average.toFixed(1)}<span style="font-size:16px;letter-spacing:0">j</span>`;
        if (statValues[2]) statValues[2].innerHTML = `${target}<span style="font-size:16px;letter-spacing:0">j</span>`;
        if (statValues[3]) statValues[3].textContent = periodData.length ? Math.min(30, periodData.length) : 0;

        const chartTitle = document.querySelector('.content-grid .card-title');
        if (chartTitle) chartTitle.textContent = jamState.period === 'month' ? 'Belajar Bulan Ini' : 'Belajar Minggu Ini';
        const chartSub = document.querySelector('.content-grid .card-sub');
        if (chartSub) chartSub.textContent = jamState.period === 'month' ? `Minggu 1 - 5 · Target ${target} jam` : `Senin - Minggu · Target ${target} jam`;
        const sessionTitle = document.querySelectorAll('.content-grid .card-title')[1];
        if (sessionTitle) sessionTitle.textContent = jamState.showAllSessions ? 'Semua Sesi Belajar' : 'Sesi Belajar Hari Ini';
        const sessionSub = document.querySelectorAll('.content-grid .card-sub')[1];
        if (sessionSub) sessionSub.textContent = jamState.showAllSessions ? `${jamState.data.length} sesi tersimpan` : `${periodData.length} sesi pada periode aktif`;
        const breakdownSub = document.querySelectorAll('.right-col .card-sub')[1];
        if (breakdownSub) breakdownSub.textContent = jamState.period === 'month' ? 'Bulan ini' : 'Minggu ini';
    } catch(error) {
        console.log(error);
        showToast("Gagal memuat data jam belajar", 'error');
    }
}

async function simpanJamBelajar(){
    const mataKuliah = document.getElementById("mk").value;
    const durasiJam = Number(document.getElementById("durasiJam").value || 0);
    const durasiMenit = Number(document.getElementById("durasiMenit").value || 0);
    const durasi = (durasiJam * 60) + durasiMenit;
    const tanggal = document.getElementById("tanggal").value;

    if (
        !mataKuliah ||
        !tanggal ||
        Number.isNaN(durasiJam) ||
        Number.isNaN(durasiMenit) ||
        durasiJam < 0 ||
        durasiJam > 24 ||
        durasiMenit < 0 ||
        durasiMenit > 59 ||
        durasi < 1 ||
        durasi > 1440
    ) {
        showToast("Lengkapi mata kuliah, tanggal, dan durasi. Maksimal 24 jam, menit 0-59.", 'error');
        return;
    }

    const data = {
        user_id: userId,
        mata_kuliah: mataKuliah,
        durasi,
        tanggal,
        aktivitas: document.getElementById("aktivitas").value.trim()
    };

    const saveBtn = document.getElementById('saveSessionBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg> Menyimpan...';
    }

    try {
        const result = await apiJson("/api/jam",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body: JSON.stringify(data)
        });

        if (!result) return;

        showToast("Sesi belajar berhasil disimpan.", 'success', 'Sesi tersimpan');

        document.getElementById("aktivitas").value = "";
        document.getElementById("durasiJam").value = "2";
        document.getElementById("durasiMenit").value = "0";
        await loadJamBelajar();
    } catch (error) {
        console.log(error);
        showToast(error.message || "Gagal menyimpan sesi belajar", 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Simpan Sesi';
        }
    }
}

document.querySelectorAll('[data-period]').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('[data-period]').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
        jamState.period = button.dataset.period;
        loadJamBelajar();
    });
});

document.getElementById('toggleSessionsBtn').addEventListener('click', () => {
    jamState.showAllSessions = !jamState.showAllSessions;
    document.getElementById('toggleSessionsBtn').classList.toggle('active', jamState.showAllSessions);
    document.getElementById('toggleSessionsBtn').textContent = jamState.showAllSessions ? 'Sesi Hari Ini' : 'Semua Sesi';
    loadJamBelajar();
});

document.getElementById('saveTargetBtn').addEventListener('click', () => {
    const week = Number(document.getElementById('targetWeek').value);
    const month = Number(document.getElementById('targetMonth').value);

    if (!Number.isFinite(week) || week < 1 || week > 168 || !Number.isFinite(month) || month < 1 || month > 744) {
        showToast('Target mingguan 1-168 jam dan target bulanan 1-744 jam.', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveTargetBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg> Menyimpan...';
    }

    setStudyTarget('week', week);
    setStudyTarget('month', month);
    loadJamBelajar();
    showToast('Target belajar berhasil disimpan.', 'success', 'Target tersimpan');

    window.setTimeout(() => {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg> Simpan Target';
        }
    }, 250);
});

document.getElementById("tanggal").value = todayInputValue();
hydrateTargetInputs();
MyStatsU.syncNotificationBadge();
loadJamBelajar();
