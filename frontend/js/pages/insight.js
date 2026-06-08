MyStatsU.pageShell("insight.html");
const userId = MyStatsU.currentUserId();

function hours(value) {
  const number = Number(value) || 0;
  return `${Number.isInteger(number) ? number : number.toFixed(1)}j`;
}

function renderInsights(items) {
  const list = document.getElementById("insightList");
  if (!items.length) {
    list.innerHTML = '<div class="empty">Belum ada insight. Klik Generate Insight untuk membuat rekomendasi pertama.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <article class="list-item">
      <div class="item-icon"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div class="item-body">
        <div class="item-title">${MyStatsU.escapeHtml(item.periode || "Insight")}</div>
        <div class="item-text">${MyStatsU.escapeHtml(item.rekomendasi)}</div>
        <div class="item-meta">${hours(item.totalJamBelajar)} belajar · ${hours(item.rataRataHarian)} rata-rata/hari · ${MyStatsU.formatDate(item.tanggalGenerate)}</div>
      </div>
    </article>
  `).join("");
}

function renderLatest(items) {
  const latest = items[0];
  document.getElementById("latestPeriod").textContent = latest ? latest.periode : "Belum ada insight";
  document.getElementById("latestText").textContent = latest ? latest.rekomendasi : "Catat jam belajar lalu generate insight untuk melihat rekomendasi mingguan.";
  document.getElementById("totalJam").textContent = latest ? hours(latest.totalJamBelajar) : "0j";
  document.getElementById("rataHarian").textContent = latest ? hours(latest.rataRataHarian) : "0j";
}

async function loadInsights() {
  const payload = await MyStatsU.apiJson(`/api/insight/${userId}`);
  const items = payload && Array.isArray(payload.data) ? payload.data : [];
  renderLatest(items);
  renderInsights(items);
}

document.getElementById("generateBtn").addEventListener("click", async () => {
  const button = document.getElementById("generateBtn");
  button.disabled = true;
  button.textContent = "Menghitung...";
  try {
    await MyStatsU.apiJson("/api/insight/generate", { method: "POST" });
    await loadInsights();
  } catch (error) {
    alert(error.message || "Gagal generate insight");
  } finally {
    button.disabled = false;
    button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>Generate Insight';
  }
});

loadInsights().catch((error) => alert(error.message || "Gagal memuat insight"));
