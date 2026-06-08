(function () {
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function currentUserId() {
    const session = MyStatsUAuth.requireAuth();
    return session.user.mahasiswaID || session.user.id || session.user.adminID;
  }

  async function apiJson(url, options = {}) {
    const headers = MyStatsUAuth.authHeaders(options.headers || {});
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      MyStatsUAuth.logout();
      return null;
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((payload && payload.message) || `Request gagal: ${response.status}`);
    }

    return payload;
  }

  async function syncNotificationBadge() {
    const userId = currentUserId();
    const badges = document.querySelectorAll('.nav-item[href="notifikasi.html"] .nav-badge');
    document.querySelectorAll('.nav-item[href="nilai.html"] .nav-badge').forEach((badge) => badge.remove());

    if (!badges.length) return;

    try {
      const payload = await apiJson(`/api/notifikasi/${userId}`);
      const items = payload && Array.isArray(payload.data) ? payload.data : [];
      const unread = items.filter((item) => !item.dibaca).length;

      badges.forEach((badge) => {
        badge.textContent = unread;
        badge.hidden = unread === 0;
      });
    } catch {
      badges.forEach((badge) => {
        badge.hidden = true;
      });
    }
  }

  function pageShell(activePage) {
    const nav = [
      { section: "Utama", href: "dashboard.html", label: "Dashboard", icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
      { href: "nilai.html", label: "Input Nilai", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>' },
      { href: "jam-belajar.html", label: "Jam Belajar", icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
      { section: "Analitik", href: "insight.html", label: "Insight", icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
      { href: "prediksi.html", label: "Prediksi IPK", icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
      { section: "Lainnya", href: "badge.html", label: "Badge & Reward", icon: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>' },
      { href: "notifikasi.html", label: "Notifikasi", badge: true, icon: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' }
    ];

    const links = nav.map((item) => {
      const section = item.section ? `<div class="nav-section-label">${item.section}</div>` : "";
      const active = item.href === activePage ? " active" : "";
      const badge = item.badge ? '<span class="nav-badge" hidden>0</span>' : '';
      return `${section}<a class="nav-item${active}" href="${item.href}"><svg viewBox="0 0 24 24">${item.icon}</svg>${item.label}${badge}</a>`;
    }).join("");

    document.body.insertAdjacentHTML("afterbegin", `
      <aside class="sidebar">
        <div class="dc dc1"></div><div class="dc dc2"></div>
        <div class="sb-brand">
          <div class="sb-brand-name">My<span>Stats</span>U</div>
          <div class="sb-brand-tag">Academic Tracker</div>
        </div>
        <nav class="sb-nav">${links}</nav>
        <div class="sb-user-wrap">
          <div class="sb-user">
            <div class="sb-user-row">
              <div class="sb-avatar">M</div>
              <div><div class="sb-user-name">Mahasiswa</div><div class="sb-user-nim">-</div></div>
            </div>
          </div>
          <a class="nav-item" href="index.html" data-logout style="margin-top:6px;color:rgba(255,255,255,0.5);">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Keluar
          </a>
        </div>
      </aside>
    `);

    const session = MyStatsUAuth.requireAuth();
    MyStatsUAuth.applyUser(session.user);

    document.querySelectorAll("[data-logout]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        MyStatsUAuth.logout();
      });
    });

    syncNotificationBadge();
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
  }

  window.MyStatsU = {
    apiJson,
    currentUserId,
    escapeHtml,
    formatDate,
    pageShell,
    syncNotificationBadge
  };
})();
