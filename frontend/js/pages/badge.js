MyStatsU.pageShell("badge.html");
const userId = MyStatsU.currentUserId();
const icon = '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>';

function renderBadges(items, earnedCount, totalCount) {
  const grid = document.getElementById("badgeGrid");
  if (!items.length) {
    grid.innerHTML = '<div class="empty">Belum ada data badge.</div>';
    return;
  }

  grid.innerHTML = items.map((item) => `
    <article class="badge-tile ${item.earned ? "earned" : ""}">
      <div class="badge-top">
        <div class="badge-icon-large">${icon}</div>
        <div class="badge-status">${item.earned ? "Terbuka" : "Terkunci"}</div>
      </div>
      <div>
        <div class="badge-name-large">${MyStatsU.escapeHtml(item.namaBadge)}</div>
        <div class="badge-desc">${MyStatsU.escapeHtml(item.deskripsi || "-")}</div>
      </div>
      ${item.earned ? `<div class="badge-date">Diperoleh ${MyStatsU.formatDate(item.tanggalDiperoleh)}</div>` : ""}
    </article>
  `).join("");
}

async function loadBadges() {
  const payload = await MyStatsU.apiJson(`/api/badge/${userId}`);
  const items = payload && Array.isArray(payload.data) ? payload.data : [];
  renderBadges(items, payload ? payload.earnedCount : 0, payload ? payload.totalCount : items.length);
}

document.getElementById("checkBtn").addEventListener("click", async () => {
  const button = document.getElementById("checkBtn");
  button.disabled = true;
  button.textContent = "Mengecek...";
  try {
    const payload = await MyStatsU.apiJson("/api/badge/check", { method: "POST" });
    if (payload && payload.message) alert(payload.message);
    await loadBadges();
  } catch (error) {
    alert(error.message || "Gagal cek badge");
  } finally {
    button.disabled = false;
    button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>Cek Badge Baru';
  }
});

loadBadges().catch((error) => alert(error.message || "Gagal memuat badge"));
