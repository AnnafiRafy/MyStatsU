MyStatsU.pageShell("notifikasi.html");
const userId = MyStatsU.currentUserId();
let allNotifications = [];

function renderStats() {
  const unread = allNotifications.filter((item) => !item.dibaca).length;
  const summary = document.getElementById("notifSummary");
  if (summary) summary.textContent = `${allNotifications.length} notifikasi, ${unread} belum dibaca`;
}

function renderNotifications() {
  renderStats();
  const items = allNotifications;
  const list = document.getElementById("notifList");
  if (!items.length) {
    list.innerHTML = '<div class="empty">Tidak ada notifikasi untuk filter ini.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <article class="list-item notif-item-page ${item.dibaca ? "" : "unread"}" data-id="${item.notifID}">
      <div class="notif-dot-page"></div>
      <div class="item-body">
        <div class="item-title">${MyStatsU.escapeHtml(item.pesan)}</div>
        <div class="item-meta">${MyStatsU.formatDate(item.tanggalKirim)}</div>
      </div>
    </article>
  `).join("");
}

async function loadNotifications() {
  const payload = await MyStatsU.apiJson(`/api/notifikasi/${userId}`);
  allNotifications = payload && Array.isArray(payload.data) ? payload.data : [];
  renderNotifications();
  MyStatsU.syncNotificationBadge();
}

document.getElementById("notifList").addEventListener("click", async (event) => {
  const item = event.target.closest("[data-id]");
  if (!item) return;
  const id = item.dataset.id;
  try {
    await MyStatsU.apiJson(`/api/notifikasi/${id}/baca`, { method: "PUT" });
    await loadNotifications();
  } catch (error) {
    alert(error.message || "Gagal update notifikasi");
  }
});

document.getElementById("readAllBtn").addEventListener("click", async () => {
  try {
    await MyStatsU.apiJson(`/api/notifikasi/${userId}/baca-semua`, { method: "PUT" });
    await loadNotifications();
  } catch (error) {
    alert(error.message || "Gagal update notifikasi");
  }
});

loadNotifications().catch((error) => alert(error.message || "Gagal memuat notifikasi"));
