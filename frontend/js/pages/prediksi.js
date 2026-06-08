MyStatsU.pageShell("prediksi.html");
const userId = MyStatsU.currentUserId();

function renderLatest(item) {
  document.getElementById("ipkPrediksi").textContent = item && item.ipkPrediksi !== null ? Number(item.ipkPrediksi).toFixed(2) : "-";
  document.getElementById("kategoriPrediksi").textContent = item ? (item.semester || "Semua semester") : "Belum dihitung";
  document.getElementById("hasilPrediksi").textContent = item ? item.hasilPrediksi : "Klik Hitung Prediksi untuk membuat estimasi IPK berdasarkan data nilai dan jam belajar yang sudah tersimpan.";
}

function renderHistory(items) {
  const list = document.getElementById("prediksiList");
  if (!items.length) {
    list.innerHTML = '<div class="empty">Belum ada prediksi. Lengkapi nilai lalu klik Hitung Prediksi.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <article class="list-item history-row">
      <div class="ipk-chip">${Number(item.ipkPrediksi || 0).toFixed(2)}</div>
      <div class="item-body">
        <div class="item-title">${MyStatsU.escapeHtml(item.semester || "Semua semester")}</div>
        <div class="item-text">${MyStatsU.escapeHtml(item.hasilPrediksi)}</div>
      </div>
      <div class="item-meta">${MyStatsU.formatDate(item.tanggalHitung)}</div>
    </article>
  `).join("");
}

async function loadPrediksi() {
  const payload = await MyStatsU.apiJson(`/api/prediksi/${userId}`);
  const items = payload && Array.isArray(payload.data) ? payload.data : [];
  renderLatest(items[0]);
  renderHistory(items);
}

document.getElementById("calculateBtn").addEventListener("click", async () => {
  const semester = document.getElementById("semesterInput").value.trim();
  const button = document.getElementById("calculateBtn");
  button.disabled = true;
  button.textContent = "Menghitung...";
  try {
    const payload = await MyStatsU.apiJson("/api/prediksi/hitung", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semester: semester || undefined })
    });
    if (payload && payload.data) renderLatest(payload.data);
    await loadPrediksi();
  } catch (error) {
    alert(error.message || "Gagal menghitung prediksi");
  } finally {
    button.disabled = false;
    button.innerHTML = '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Hitung Prediksi';
  }
});

document.getElementById("clearSemester").addEventListener("click", () => {
  document.getElementById("semesterInput").value = "";
});

loadPrediksi().catch((error) => alert(error.message || "Gagal memuat prediksi"));
