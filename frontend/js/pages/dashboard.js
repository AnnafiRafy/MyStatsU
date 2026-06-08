const session = MyStatsUAuth.requireAuth();
const userRole = session.user.role || (session.user.adminID ? 'admin' : 'mahasiswa');
const isAdmin = userRole === 'admin';
const userId = session.user.mahasiswaID || session.user.id;
const gradePoint = { A:4, AB:3.5, B:3, BC:2.5, C:2, D:1, E:0 };
const chartState = { nilaiData: [], chartType: 'ipk' };
const dayLabels = ['SEN','SEL','RAB','KAM','JUM','SAB','MIN'];

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
    }[char]));
}

function minutesToHours(minutes) {
    return (Number(minutes) || 0) / 60;
}

function formatHours(hours) {
    return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function formatGpa(value) {
    return (Number(value) || 0).toFixed(2);
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function setAdminShell() {
    const firstName = (session.user.nama || 'Admin').trim().split(/\s+/)[0] || 'Admin';
    const main = document.querySelector('.main');
    if (!main) return;

    document.title = 'MyStatsU — Admin Dashboard';
    simplifyAdminSidebar();
    const sidebarUserRole = document.querySelector('.sb-user-nim');
    if (sidebarUserRole) sidebarUserRole.textContent = session.user.email || 'Administrator';

    main.innerHTML = `
      <div class="topbar">
        <div class="topbar-left">
          <h1>Halo, <em>${escapeHtml(firstName)}</em></h1>
          <div class="topbar-sub" id="adminDate">Dashboard operasional admin</div>
        </div>
        <div class="topbar-right">
          <button class="admin-action primary" id="refreshAdminBtn" type="button">Refresh Data</button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card red">
          <div class="stat-card-top">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
            <span class="stat-change">Total</span>
          </div>
          <div class="stat-value" id="adminTotalMahasiswa">0</div>
          <div class="stat-label">Mahasiswa Terdaftar</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg></div>
            <span class="stat-change">Aktif</span>
          </div>
          <div class="stat-value" id="adminVerified">0</div>
          <div class="stat-label">Sudah Diverifikasi</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
            <span class="stat-change">Butuh aksi</span>
          </div>
          <div class="stat-value" id="adminPending">0</div>
          <div class="stat-label">Belum Verifikasi</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-top">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
            <span class="stat-change" id="adminJamLabel">Jam: 0</span>
          </div>
          <div class="stat-value" id="adminTotalNilai">0</div>
          <div class="stat-label">Data Nilai Masuk</div>
        </div>
      </div>

      <div class="admin-grid">
        <section class="admin-panel">
          <div class="card-header">
            <div>
              <div class="card-title">Mahasiswa Terbaru</div>
              <div class="card-sub" id="adminTableSub">Ringkasan akun mahasiswa</div>
            </div>
          </div>
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Mahasiswa</th>
                  <th>NIM</th>
                  <th>Status</th>
                  <th>Tanggal Daftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="adminStudentRows">
                <tr><td colspan="6" class="admin-empty">Memuat mahasiswa...</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <aside class="right-col">
          <section class="admin-panel">
            <div class="card-title">Menunggu Verifikasi</div>
            <div class="card-sub">Prioritas tindakan admin</div>
            <div class="admin-list" id="pendingStudentList"></div>
          </section>

          <section class="admin-panel">
            <div class="card-title">Broadcast Notifikasi</div>
            <div class="card-sub">Pesan singkat ke semua mahasiswa</div>
            <form class="broadcast-form" id="broadcastForm">
              <select id="broadcastType">
                <option value="motivasi">Motivasi</option>
                <option value="info">Info</option>
                <option value="peringatan">Peringatan</option>
                <option value="pencapaian">Pencapaian</option>
              </select>
              <textarea id="broadcastMessage" placeholder="Tulis pesan untuk semua mahasiswa..."></textarea>
              <button class="admin-action primary" type="submit">Kirim Broadcast</button>
            </form>
          </section>
        </aside>
      </div>
    `;

    const dateSub = document.getElementById('adminDate');
    if (dateSub) {
        dateSub.textContent = `Dashboard operasional admin · ${new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(new Date())}`;
    }

    document.getElementById('refreshAdminBtn')?.addEventListener('click', loadAdminDashboard);
    document.getElementById('broadcastForm')?.addEventListener('submit', sendBroadcast);
}

function simplifyAdminSidebar() {
    const nav = document.querySelector('.sb-nav');
    if (nav) {
        nav.innerHTML = `
          <div class="nav-section-label">Admin</div>
          <a class="nav-item active" href="dashboard.html">
            <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Dashboard
          </a>
        `;
    }

    const logoutLink = document.querySelector('aside a[href="index.html"]');
    if (logoutLink) logoutLink.setAttribute('data-logout', '');

    document.querySelectorAll('[data-logout], aside a[href="index.html"]').forEach((el) => {
        el.addEventListener('click', (event) => {
            event.preventDefault();
            MyStatsUAuth.logout();
        });
    });
}

async function loadAdminDashboard() {
    try {
        const [statsPayload, mahasiswaPayload] = await Promise.all([
            apiJson('/api/admin/stats'),
            apiJson('/api/admin/mahasiswa')
        ]);

        if (!statsPayload || !mahasiswaPayload) return;

        const stats = statsPayload.data || {};
        const mahasiswa = Array.isArray(mahasiswaPayload.data) ? mahasiswaPayload.data : [];
        const pending = mahasiswa.filter(item => !item.isVerified);

        document.getElementById('adminTotalMahasiswa').textContent = stats.totalMahasiswa ?? mahasiswa.length;
        document.getElementById('adminVerified').textContent = stats.terverifikasi ?? mahasiswa.filter(item => item.isVerified).length;
        document.getElementById('adminPending').textContent = stats.belumVerifikasi ?? pending.length;
        document.getElementById('adminTotalNilai').textContent = stats.totalNilai ?? 0;

        const jamLabel = document.getElementById('adminJamLabel');
        if (jamLabel) jamLabel.textContent = `Jam: ${stats.totalJamBelajar ?? 0}`;

        const shownCount = Math.min(mahasiswa.length, 6);
        const tableSub = document.getElementById('adminTableSub');
        if (tableSub) tableSub.textContent = `${shownCount} akun terbaru dari ${mahasiswa.length} mahasiswa`;

        renderAdminStudents(mahasiswa);
        renderPendingStudents(pending);
    } catch (error) {
        console.log(error);
        alert('Gagal memuat dashboard admin');
    }
}

function renderAdminStudents(mahasiswa) {
    const rows = document.getElementById('adminStudentRows');
    if (!rows) return;

    if (!mahasiswa.length) {
        rows.innerHTML = '<tr><td colspan="6" class="admin-empty">Belum ada mahasiswa terdaftar.</td></tr>';
        return;
    }

    rows.innerHTML = mahasiswa.slice(0, 6).map(item => `
        <tr>
          <td>
            <strong>${escapeHtml(item.nama || '-')}</strong>
            ${escapeHtml(item.email || '-')}
          </td>
          <td>${escapeHtml(item.nim || '-')}</td>
          <td><span class="status-pill ${item.isVerified ? 'ok' : ''}">${item.isVerified ? 'Terverifikasi' : 'Belum Verifikasi'}</span></td>
          <td>${formatAdminDate(item.tanggalDaftar)}</td>
          <td>
            <button class="admin-action ${item.isVerified ? '' : 'primary'}" type="button" data-verify-id="${item.mahasiswaID}" data-next-status="${item.isVerified ? 'false' : 'true'}">
              ${item.isVerified ? 'Nonaktifkan' : 'Verifikasi'}
            </button>
          </td>
        </tr>
    `).join('');

    rows.querySelectorAll('[data-verify-id]').forEach(button => {
        button.addEventListener('click', () => updateVerification(button.dataset.verifyId, button.dataset.nextStatus === 'true'));
    });
}

function renderPendingStudents(pending) {
    const list = document.getElementById('pendingStudentList');
    if (!list) return;

    if (!pending.length) {
        list.innerHTML = '<div class="admin-empty">Tidak ada akun yang menunggu verifikasi.</div>';
        return;
    }

    list.innerHTML = pending.slice(0, 5).map(item => `
        <div class="admin-list-item">
          <div>
            <strong>${escapeHtml(item.nama || '-')}</strong>
            <span>${escapeHtml(item.nim || '-')} · ${escapeHtml(item.jurusan || '-')}</span>
          </div>
          <button class="admin-action primary" type="button" data-pending-id="${item.mahasiswaID}">Verifikasi</button>
        </div>
    `).join('');

    list.querySelectorAll('[data-pending-id]').forEach(button => {
        button.addEventListener('click', () => updateVerification(button.dataset.pendingId, true));
    });
}

async function updateVerification(id, status) {
    try {
        const response = await fetch(`/api/admin/mahasiswa/${id}/verifikasi`, {
            method: 'PUT',
            headers: MyStatsUAuth.authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ status })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error((payload && payload.message) || 'Gagal update verifikasi');
        await loadAdminDashboard();
    } catch (error) {
        alert(error.message || 'Gagal update verifikasi');
    }
}

async function sendBroadcast(event) {
    event.preventDefault();
    const pesan = document.getElementById('broadcastMessage')?.value.trim();
    const tipe = document.getElementById('broadcastType')?.value || 'motivasi';

    if (!pesan) {
        alert('Pesan broadcast wajib diisi');
        return;
    }

    try {
        const response = await fetch('/api/admin/notifikasi/broadcast', {
            method: 'POST',
            headers: MyStatsUAuth.authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ pesan, tipe })
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error((payload && payload.message) || 'Gagal mengirim broadcast');
        document.getElementById('broadcastMessage').value = '';
        alert((payload && payload.message) || 'Broadcast terkirim');
    } catch (error) {
        alert(error.message || 'Gagal mengirim broadcast');
    }
}

function formatAdminDate(value) {
    if (!value) return '-';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

async function loadDashboard(){
    try {
        const [rawNilaiData, rawJamData, rawBadgeData, rawNotifikasiData] = await Promise.all([
            apiJson(`/api/nilai/${userId}`),
            apiJson(`/api/jam/${userId}`),
            apiJson(`/api/badge/${userId}`),
            apiJson(`/api/notifikasi/${userId}`)
        ]);

        if (!rawNilaiData || !rawJamData || !rawBadgeData || !rawNotifikasiData) return;

        const nilaiData = Array.isArray(rawNilaiData) ? rawNilaiData : [];
        const jamData = Array.isArray(rawJamData) ? rawJamData : [];
        const badgeData = Array.isArray(rawBadgeData.data) ? rawBadgeData.data : [];
        const notifikasiData = Array.isArray(rawNotifikasiData.data) ? rawNotifikasiData.data : [];
        const badgeCount = Number(rawBadgeData.earnedCount) || badgeData.filter(item => item.earned).length;
        const totalBadgeCount = Number(rawBadgeData.totalCount) || badgeData.length;
        chartState.nilaiData = nilaiData;

        const summary = summarizeNilai(nilaiData);
        const semesterSeries = buildSemesterSeries(nilaiData);
        const ipkChange = getLatestIpkChange(semesterSeries);
        const weekSummary = renderWeekSummary(jamData);
        const mataKuliah = new Set(nilaiData.map(item => item.mata_kuliah).filter(Boolean)).size;

        const statValues = document.querySelectorAll('.stat-grid .stat-value');
        if (statValues[0]) statValues[0].textContent = summary.ipkText;
        if (statValues[1]) statValues[1].textContent = mataKuliah;
        if (statValues[2]) statValues[2].innerHTML = `${formatHours(weekSummary.weeklyTotal)}<span style="font-size:16px;letter-spacing:0">j</span>`;
        if (statValues[3]) statValues[3].textContent = badgeCount;

        const statChanges = document.querySelectorAll('.stat-grid .stat-change');
        if (statChanges[0]) {
            statChanges[0].textContent = ipkChange === null
                ? (summary.sks ? 'Input awal' : 'Belum ada')
                : `${ipkChange >= 0 ? '+' : ''}${ipkChange.toFixed(2)}`;
        }
        if (statChanges[1]) statChanges[1].textContent = `${nilaiData.length} input`;
        if (statChanges[2]) statChanges[2].textContent = 'Minggu ini';
        if (statChanges[3]) statChanges[3].textContent = `${badgeCount} aktif`;

        const unreadCount = notifikasiData.filter(item => !item.dibaca).length;
        const notifBadge = document.querySelector('.nav-item[href="notifikasi.html"] .nav-badge');
        if (notifBadge) {
            notifBadge.textContent = unreadCount;
            notifBadge.hidden = unreadCount === 0;
        }

        const dateSub = document.querySelector('.topbar-sub');
        if (dateSub) {
            dateSub.textContent = `Semester Genap 2024/2025 · ${new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).format(new Date())}`;
        }

        renderSemesterChart();
        renderNotifications(notifikasiData);
        renderBadgeSummary(badgeData, badgeCount, totalBadgeCount);
    } catch(error) {
        console.log(error);
        alert('Gagal memuat dashboard');
    }
}

async function apiJson(url) {
    const response = await fetch(url, {
        headers: MyStatsUAuth.authHeaders()
    });

    if (response.status === 401 || response.status === 403) {
        MyStatsUAuth.logout();
        return null;
    }

    if (!response.ok) throw new Error(`Request gagal: ${response.status}`);
    return response.json();
}

function gradeFromNilai(nilai) {
    const angka = Number(nilai);
    if (angka >= 85) return 'A';
    if (angka >= 80) return 'AB';
    if (angka >= 75) return 'B';
    if (angka >= 70) return 'BC';
    if (angka >= 60) return 'C';
    if (angka >= 50) return 'D';
    return 'E';
}

function nilaiPoint(item) {
    const grade = String(item.grade || gradeFromNilai(item.nilai_angka)).toUpperCase();
    return gradePoint[grade];
}

function summarizeNilai(nilaiData) {
    let totalBobot = 0;
    let totalSks = 0;

    nilaiData.forEach(item => {
        const sks = Number(item.sks) || 0;
        const point = nilaiPoint(item);
        if (!sks || point === undefined) return;
        totalBobot += sks * point;
        totalSks += sks;
    });

    const ipk = totalSks ? totalBobot / totalSks : 0;

    return {
        ipk,
        ipkText: formatGpa(ipk),
        sks: totalSks,
        totalBobot
    };
}

function semesterOrderKey(label, fallbackIndex) {
    const text = String(label || '').trim();
    const semesterNumber = text.match(/(?:sem|semester)\s*([0-9]+)/i);
    if (semesterNumber) return Number(semesterNumber[1]);

    const years = text.match(/(\d{2,4})\D+(\d{2,4})/);
    if (years) {
        const startYear = normalizeYear(years[1]);
        const phase = /genap/i.test(text) ? 1 : 0;
        return startYear * 2 + phase;
    }

    return 10000 + fallbackIndex;
}

function normalizeYear(value) {
    const year = Number(value);
    return String(value).length === 2 ? 2000 + year : year;
}

function shortSemesterLabel(label, index) {
    const text = String(label || '').trim();
    if (!text) return `Sem ${index + 1}`;
    if (/belum/i.test(text)) return 'Tanpa Sem';

    const years = text.match(/(\d{2,4})\D+(\d{2,4})/);
    const prefix = /genap/i.test(text) ? 'Gen' : /ganjil/i.test(text) ? 'Gan' : '';
    if (years && prefix) return `${prefix} ${String(years[1]).slice(-2)}/${String(years[2]).slice(-2)}`;

    const semesterNumber = text.match(/(?:sem|semester)\s*([0-9]+)/i);
    if (semesterNumber) return `Sem ${semesterNumber[1]}`;

    return text.length > 12 ? `${text.slice(0, 11)}...` : text;
}

function groupNilaiBySemester(nilaiData) {
    const groups = new Map();

    nilaiData.forEach((item, index) => {
        const semester = String(item.semester || 'Semester Belum Diisi').trim() || 'Semester Belum Diisi';

        if (!groups.has(semester)) {
            groups.set(semester, {
                semester,
                firstIndex: index,
                order: semesterOrderKey(semester, index),
                items: []
            });
        }

        groups.get(semester).items.push(item);
    });

    return [...groups.values()].sort((a, b) => a.order - b.order || a.firstIndex - b.firstIndex);
}

function buildSemesterSeries(nilaiData) {
    let cumulativeBobot = 0;
    let cumulativeSks = 0;

    return groupNilaiBySemester(nilaiData).map((group, index) => {
        const semesterSummary = summarizeNilai(group.items);
        cumulativeBobot += semesterSummary.totalBobot;
        cumulativeSks += semesterSummary.sks;

        return {
            fullLabel: group.semester,
            label: shortSemesterLabel(group.semester, index),
            count: group.items.length,
            sks: semesterSummary.sks,
            ips: semesterSummary.ipk,
            ipk: cumulativeSks ? cumulativeBobot / cumulativeSks : 0
        };
    });
}

function getLatestIpkChange(series) {
    if (series.length < 2) return null;

    const latest = series[series.length - 1].ipk;
    const previous = series[series.length - 2].ipk;
    return latest - previous;
}

function chartConfig() {
    return {
        min: 0,
        max: 4,
        top: 14,
        bottom: 224,
        areaBottom: 260,
        left: 44,
        right: 610,
        pointStart: 76,
        pointEnd: 586
    };
}

function chartY(value) {
    const cfg = chartConfig();
    const ratio = (clamp(Number(value) || 0, cfg.min, cfg.max) - cfg.min) / (cfg.max - cfg.min);
    return cfg.bottom - (ratio * (cfg.bottom - cfg.top));
}

function chartDefs() {
    return `
        <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#CC0000" stop-opacity="0.18"/>
                <stop offset="85%" stop-color="#CC0000" stop-opacity="0.03"/>
                <stop offset="100%" stop-color="#CC0000" stop-opacity="0"/>
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
        </defs>
    `;
}

function chartAxes() {
    const cfg = chartConfig();
    const axisLabels = [4, 3, 2, 1, 0];
    const grid = axisLabels.map(value => {
        const y = chartY(value);
        return `
            <text x="0" y="${y + 4}" font-family="Poppins" font-size="10" fill="#BBBBBB" font-weight="600">${value.toFixed(1)}</text>
            <line x1="${cfg.left}" y1="${y}" x2="${cfg.right}" y2="${y}" stroke="#EBEBEB" stroke-width="1"/>
        `;
    }).join('');

    return `
        ${grid}
        <line x1="${cfg.left}" y1="${cfg.areaBottom}" x2="${cfg.right}" y2="${cfg.areaBottom}" stroke="#EBEBEB" stroke-width="1"/>
    `;
}

function svgNumber(value) {
    return Number(value).toFixed(1).replace(/\.0$/, '');
}

function smoothPath(points) {
    if (!points.length) return '';
    if (points.length === 1) return `M${svgNumber(points[0].x)},${svgNumber(points[0].y)}`;

    let path = `M${svgNumber(points[0].x)},${svgNumber(points[0].y)}`;

    for (let index = 0; index < points.length - 1; index++) {
        const p0 = points[index - 1] || points[index];
        const p1 = points[index];
        const p2 = points[index + 1];
        const p3 = points[index + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C${svgNumber(cp1x)},${svgNumber(cp1y)} ${svgNumber(cp2x)},${svgNumber(cp2y)} ${svgNumber(p2.x)},${svgNumber(p2.y)}`;
    }

    return path;
}

function renderSemesterChart() {
    const svg = document.getElementById('semesterChart');
    const labels = document.getElementById('semesterChartLabels');
    const legend = document.getElementById('semesterChartLegend');
    const note = document.getElementById('semesterChartNote');
    const chartCard = document.querySelector('.content-grid > .chart-card');
    const subtitle = chartCard ? chartCard.querySelector('.card-sub') : null;
    const type = chartState.chartType;
    const series = buildSemesterSeries(chartState.nilaiData);
    const label = type === 'ipk' ? 'IPK Kumulatif' : 'IPS per Semester';

    if (legend) legend.textContent = label;
    if (subtitle) subtitle.textContent = type === 'ipk'
        ? 'IPK kumulatif dihitung langsung dari input nilai'
        : 'IPS tiap semester dihitung langsung dari input nilai';

    if (!svg) return;

    if (!series.length) {
        svg.innerHTML = `
            ${chartDefs()}
            ${chartAxes()}
            <text x="327" y="132" font-family="Poppins" font-size="13" fill="#AAAAAA" font-weight="800" text-anchor="middle">Belum ada data nilai</text>
            <text x="327" y="154" font-family="Poppins" font-size="11" fill="#AAAAAA" font-weight="600" text-anchor="middle">Input nilai dulu agar grafik muncul otomatis.</text>
        `;
        if (labels) {
            labels.innerHTML = '';
            labels.style.justifyContent = 'center';
        }
        if (note) note.textContent = 'Data grafik kosong';
        svg.setAttribute('aria-label', 'Grafik kosong karena belum ada input nilai');
        return;
    }

    const cfg = chartConfig();
    const width = series.length === 1 ? 0 : (cfg.pointEnd - cfg.pointStart) / (series.length - 1);
    const points = series.map((item, index) => {
        const value = Number(item[type]) || 0;
        const x = series.length === 1 ? (cfg.pointStart + cfg.pointEnd) / 2 : cfg.pointStart + (index * width);

        return {
            ...item,
            value,
            x,
            y: chartY(value)
        };
    });

    const linePath = smoothPath(points);
    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = points.length === 1
        ? `M${svgNumber(last.x - 10)},${svgNumber(last.y)} L${svgNumber(last.x + 10)},${svgNumber(last.y)} L${svgNumber(last.x + 10)},${cfg.areaBottom} L${svgNumber(last.x - 10)},${cfg.areaBottom} Z`
        : `${linePath} L${svgNumber(last.x)},${cfg.areaBottom} L${svgNumber(first.x)},${cfg.areaBottom} Z`;
    const dots = points.map((point, index) => {
        const latest = index === points.length - 1;
        const title = `${point.fullLabel}: ${label} ${formatGpa(point.value)}`;

        return `
            <circle cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="${latest ? 7 : 4.5}" fill="${latest ? '#CC0000' : '#fff'}" stroke="${latest ? '#fff' : '#CC0000'}" stroke-width="${latest ? 2.5 : 2}">
                <title>${escapeHtml(title)}</title>
            </circle>
            ${latest ? `<circle cx="${svgNumber(point.x)}" cy="${svgNumber(point.y)}" r="12" fill="#CC0000" fill-opacity="0.12"/>` : ''}
        `;
    }).join('');
    const tooltip = renderLatestTooltip(last, type === 'ipk' ? 'IPK' : 'IPS');

    svg.innerHTML = `
        ${chartDefs()}
        ${chartAxes()}
        <path d="${areaPath}" fill="url(#areaGrad)"/>
        <path d="${linePath}" fill="none" stroke="#CC0000" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/>
        ${dots}
        ${tooltip}
    `;
    svg.setAttribute('aria-label', `${label} berdasarkan ${series.length} semester input`);

    if (labels) {
        labels.style.justifyContent = series.length > 1 ? 'space-between' : 'center';
        labels.innerHTML = series.map((item, index) => `
            <span title="${escapeHtml(item.fullLabel)}">${escapeHtml(item.label)}${index === series.length - 1 ? '*' : ''}</span>
        `).join('');
    }
    if (note) note.textContent = '*Semester terakhir dari data input';
}

function renderLatestTooltip(point, label) {
    const tooltipWidth = 116;
    const tooltipHeight = 30;
    const labelText = `${label} ${point.label}`;
    const tipX = clamp(point.x - (tooltipWidth / 2), 46, 620 - tooltipWidth - 6);
    const placeBelow = point.y < 58;
    const tipY = placeBelow ? point.y + 18 : point.y - 44;
    const pointer = placeBelow
        ? `${svgNumber(point.x - 5)},${svgNumber(tipY)} ${svgNumber(point.x + 5)},${svgNumber(tipY)} ${svgNumber(point.x)},${svgNumber(point.y + 4)}`
        : `${svgNumber(point.x - 5)},${svgNumber(tipY + tooltipHeight)} ${svgNumber(point.x + 5)},${svgNumber(tipY + tooltipHeight)} ${svgNumber(point.x)},${svgNumber(point.y - 4)}`;

    return `
        <rect x="${svgNumber(tipX)}" y="${svgNumber(tipY)}" width="${tooltipWidth}" height="${tooltipHeight}" rx="8" fill="#1a1a1a"/>
        <text x="${svgNumber(tipX + 8)}" y="${svgNumber(tipY + 17)}" font-family="Poppins" font-size="9" font-weight="700" fill="#FFFFFF" fill-opacity="0.58">${escapeHtml(labelText)}</text>
        <text x="${svgNumber(tipX + tooltipWidth - 8)}" y="${svgNumber(tipY + 19)}" font-family="Poppins" font-size="14" font-weight="900" fill="#fff" text-anchor="end">${formatGpa(point.value)}</text>
        <polygon points="${pointer}" fill="#1a1a1a"/>
    `;
}

function setupChartControls() {
    document.querySelectorAll('[data-chart-type]').forEach(chip => {
        chip.addEventListener('click', () => {
            chartState.chartType = chip.dataset.chartType || 'ipk';

            document.querySelectorAll('[data-chart-type]').forEach(item => {
                item.classList.toggle('active', item === chip);
            });

            renderSemesterChart();
        });
    });
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

function dayIndexInWeek(date, weekStart) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return Math.round((copy - weekStart) / 86400000);
}

function renderWeekSummary(jamData) {
    const weekTotals = Array(7).fill(0);
    const weekStart = startOfWeek(new Date());
    const weeklyTarget = getStudyTarget('week');

    jamData.forEach(item => {
        const date = parseDateOnly(item.tanggal);
        if (!date) return;
        const index = dayIndexInWeek(date, weekStart);
        if (index >= 0 && index < 7) weekTotals[index] += minutesToHours(item.durasi);
    });

    const weeklyTotal = weekTotals.reduce((total, item) => total + item, 0);
    const max = Math.max(6, ...weekTotals);

    const jamSub = document.querySelector('.jam-card .card-sub');
    if (jamSub) jamSub.textContent = `Total: ${formatHours(weeklyTotal)} jam · Target: ${weeklyTarget} jam`;

    document.querySelectorAll('.week-grid .day-col').forEach((col, index) => {
        const total = weekTotals[index];
        const bar = col.querySelector('.day-bar');
        const value = col.querySelector('.day-val');

        if (!bar || !value) return;
        const height = total ? Math.max(6, Math.round((total / max) * 100)) : 0;
        bar.style.height = `${height}%`;
        bar.className = 'day-bar ' + (total >= 4 ? 'active' : total > 0 ? 'mid' : '');
        value.textContent = `${formatHours(total)}j`;
    });

    return { weekTotals, weeklyTotal };
}

function getStudyTarget(period) {
    const defaultTarget = period === 'month' ? 120 : 30;
    const key = `mystatsuStudyTarget:${userId}:${period}`;
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : defaultTarget;
}

function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function calculateStudyStreak(jamData) {
    const days = new Set(jamData.map(item => item.tanggal).filter(Boolean));
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    let streak = 0;
    while (days.has(dateKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
}

function renderNotifications(notifikasiData) {
    const list = document.querySelector('.notif-list');
    if (!list) return;

    if (!notifikasiData.length) {
        list.innerHTML = `
            <div class="notif-item">
                <div class="notif-dot2"></div>
                <div class="notif-msg">Belum ada notifikasi.</div>
            </div>
        `;
        return;
    }

    list.innerHTML = notifikasiData.slice(0, 3).map(item => `
        <div class="notif-item ${item.dibaca ? '' : 'unread'}">
            <div class="notif-dot2"></div>
            <div class="notif-msg">${escapeHtml(item.pesan || '-')}</div>
        </div>
    `).join('');
}

function badgeIconSvg(type) {
    const icons = {
        nilai: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        jam_belajar: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        streak: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        spesial: '<path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M6 5h12v7a6 6 0 0 1-12 0Z"/><path d="M12 18v3"/><path d="M8 21h8"/>'
    };

    return icons[type] || '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>';
}

function renderBadgeSummary(badges, badgeCount, totalBadgeCount) {
    const badgeSub = document.querySelector('.badge-card .card-sub');
    if (badgeSub) badgeSub.textContent = `${badgeCount} dari ${totalBadgeCount} badge terbuka`;

    const badgeGrid = document.querySelector('.badge-grid');
    if (!badgeGrid) return;

    if (!badges.length) {
        badgeGrid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;color:var(--muted);font-size:12px;font-weight:700;padding:22px 10px;">
                Belum ada data badge.
            </div>
        `;
        return;
    }

    badgeGrid.innerHTML = badges.slice(0, 8).map(item => `
        <div class="badge-item ${item.earned ? 'earned' : ''}" title="${escapeHtml(item.deskripsi || item.namaBadge || '')}">
          ${item.earned ? '' : '<div class="badge-lock"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>'}
          <div class="badge-icon">
            <svg viewBox="0 0 24 24">${badgeIconSvg(item.tipe)}</svg>
          </div>
          <div class="badge-name">${escapeHtml(item.namaBadge || 'Badge')}</div>
        </div>
    `).join('');
}

if (isAdmin) {
    setAdminShell();
    loadAdminDashboard();
} else {
    setupChartControls();
    loadDashboard();
}
