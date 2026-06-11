"use strict";

MyStatsU.pageShell("prediksi.html");

const userId = MyStatsU.currentUserId();
const predictionModel = window.MyStatsUPredictionModel;
const state = {
  grades: [],
  studySessions: [],
  model: null,
  metadata: null,
  modelBusy: false
};

function historyKey() {
  return `mystatsuIpkPredictionHistory:${userId}`;
}

function profileKey() {
  return `mystatsuIpkPredictionProfile:${userId}`;
}

function ensureToastUi() {
  if (document.getElementById("toastStack")) return;
  document.body.insertAdjacentHTML(
    "beforeend",
    '<div class="prediction-toast-stack" id="toastStack" aria-live="polite" aria-atomic="true"></div>'
  );
}

function showToast(message, type = "success") {
  ensureToastUi();
  const toast = document.createElement("div");
  toast.className = `prediction-toast ${type}`;
  toast.textContent = message;
  document.getElementById("toastStack").appendChild(toast);
  window.setTimeout(() => toast.remove(), 3200);
}

function readJsonStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function readHistory() {
  const items = readJsonStorage(historyKey(), []);
  return Array.isArray(items) ? items : [];
}

function saveHistory(item) {
  const items = [item, ...readHistory()].slice(0, 12);
  localStorage.setItem(historyKey(), JSON.stringify(items));
  return items;
}

function saveProfile() {
  localStorage.setItem(profileKey(), JSON.stringify({
    attendance: Number(document.getElementById("attendanceInput").value),
    previousGpa: Number(document.getElementById("previousGpaInput").value)
  }));
}

function semesterOrderValue(label) {
  const text = String(label || "");
  const yearMatch = text.match(/(\d{4})\/(\d{4})/);
  const startYear = yearMatch ? Number(yearMatch[1]) : 0;
  const period = /^genap/i.test(text) ? 2 : /^ganjil/i.test(text) ? 1 : 0;
  return (startYear * 10) + period;
}

function hydrateProfile() {
  const profile = readJsonStorage(profileKey(), {});
  if (Number.isFinite(profile.attendance)) {
    document.getElementById("attendanceInput").value = profile.attendance;
  }
  if (Number.isFinite(profile.previousGpa)) {
    document.getElementById("previousGpaInput").value = profile.previousGpa.toFixed(2);
  }
}

function setModelStatus(text, type) {
  const badge = document.getElementById("modelState");
  badge.textContent = text;
  badge.className = `model-pill ${type || ""}`.trim();
}

function setButtonsDisabled(disabled) {
  document.getElementById("calculateBtn").disabled = disabled;
}

function renderModelReady() {
  setModelStatus("Model siap", "ready");
}

async function initializeModel() {
  if (state.modelBusy) return;
  if (!window.tf || !predictionModel) {
    setModelStatus("TensorFlow gagal dimuat", "error");
    throw new Error("TensorFlow.js gagal dimuat.");
  }

  state.modelBusy = true;
  setButtonsDisabled(true);

  try {
    setModelStatus("Memuat model", "loading");
    const saved = await predictionModel.loadModel(tf, userId);
    if (saved) {
      state.model = saved.model;
      state.metadata = saved.metadata;
      renderModelReady();
      return;
    }

    setModelStatus("Melatih epoch 0/80", "loading");
    const training = await predictionModel.trainModel(tf, {
      onEpochEnd(epoch) {
        if (epoch === 1 || epoch % 10 === 0 || epoch === predictionModel.EPOCHS) {
          setModelStatus(`Melatih epoch ${epoch}/80`, "loading");
        }
      }
    });
    state.model = training.model;
    state.metadata = await predictionModel.saveModel(tf, state.model, userId, training);
    renderModelReady();
  } finally {
    state.modelBusy = false;
    setButtonsDisabled(false);
  }
}

function populateSemesters() {
  const select = document.getElementById("semesterInput");
  const selected = select.value;
  const semesters = [...new Set(
    state.grades.map((item) => String(item.semester || "").trim()).filter(Boolean)
  )].sort((a, b) => semesterOrderValue(b) - semesterOrderValue(a));

  select.innerHTML = [
    '<option value="">Semua semester</option>',
    ...semesters.map((semester) => (
      `<option value="${MyStatsU.escapeHtml(semester)}">${MyStatsU.escapeHtml(semester)}</option>`
    ))
  ].join("");
  if (semesters.includes(selected)) select.value = selected;
}

function getFeatureProfile() {
  const semester = document.getElementById("semesterInput").value;
  const attendance = Number(document.getElementById("attendanceInput").value);
  const previousGpa = Number(document.getElementById("previousGpaInput").value);
  const gradeSummary = predictionModel.summarizeGrades(state.grades, semester);
  const studySummary = predictionModel.summarizeStudySessions(state.studySessions);

  return {
    semester,
    gradeSummary,
    studySummary,
    features: {
      studyHours: studySummary.hoursPerWeek,
      attendance,
      consistency: studySummary.consistency,
      previousGpa,
      averageGrade: gradeSummary.averageGrade
    }
  };
}

function validateProfile(profile) {
  const { attendance, previousGpa } = profile.features;
  if (!Number.isFinite(attendance) || attendance < 0 || attendance > 100) {
    throw new Error("Persentase kehadiran harus berada pada rentang 0 sampai 100.");
  }
  if (!Number.isFinite(previousGpa) || previousGpa < 0 || previousGpa > 4) {
    throw new Error("IPK semester lalu harus berada pada rentang 0.00 sampai 4.00.");
  }
  if (!profile.gradeSummary.courseCount) {
    throw new Error("Belum ada data nilai pada semester yang dipilih.");
  }
}

function renderFeatureSummary(profile) {
  const { features, studySummary } = profile;
  document.getElementById("studyHoursValue").textContent = `${features.studyHours.toFixed(1)} jam/minggu`;
  document.getElementById("attendanceValue").textContent = `${features.attendance.toFixed(0)}%`;
  document.getElementById("consistencyValue").textContent = `${features.consistency.toFixed(0)}%`;
  document.getElementById("previousGpaValue").textContent = features.previousGpa.toFixed(2);
  document.getElementById("averageGradeValue").textContent = features.averageGrade.toFixed(1);

  let trendText = "Tren belajar stabil dibanding dua minggu awal.";
  let trendClass = "stable";
  if (studySummary.trendHours > 0.35) {
    trendText = `Tren naik ${studySummary.trendHours.toFixed(1)} jam/minggu pada dua minggu terakhir.`;
    trendClass = "up";
  } else if (studySummary.trendHours < -0.35) {
    trendText = `Tren turun ${Math.abs(studySummary.trendHours).toFixed(1)} jam/minggu pada dua minggu terakhir.`;
    trendClass = "down";
  }
  document.getElementById("trendNote").className = `trend-note ${trendClass}`;
  document.getElementById("trendNote").textContent =
    `${trendText} ${studySummary.activeDays} hari aktif dalam 28 hari.`;
}

function renderLatest(item) {
  document.getElementById("ipkPrediksi").textContent = Number(item.ipkPrediksi).toFixed(2);
  document.getElementById("kategoriPrediksi").textContent = item.category;
  document.getElementById("hasilPrediksi").textContent = item.description;
  document.getElementById("predictionMeta").textContent =
    `${item.semester || "Semua semester"} · ${item.courseCount} mata kuliah · TensorFlow.js`;
}

function renderContributions(items) {
  const container = document.getElementById("contributionList");
  container.innerHTML = items.map((item) => `
    <div class="contribution-item">
      <div class="contribution-head">
        <span>${MyStatsU.escapeHtml(item.label)}</span>
        <strong>${item.percentage.toFixed(1)}%</strong>
      </div>
      <div class="contribution-track">
        <div class="contribution-fill" style="width:${Math.max(2, item.percentage).toFixed(1)}%"></div>
      </div>
    </div>
  `).join("");
}

function renderHistory(items = readHistory()) {
  const list = document.getElementById("prediksiList");
  if (!items.length) {
    list.innerHTML = '<div class="empty">Belum ada prediksi dari model browser.</div>';
    return;
  }

  list.innerHTML = items.map((item) => `
    <article class="list-item history-row">
      <div class="ipk-chip">${Number(item.ipkPrediksi || 0).toFixed(2)}</div>
      <div class="item-body">
        <div class="item-title">${MyStatsU.escapeHtml(item.semester || "Semua semester")} · ${MyStatsU.escapeHtml(item.category)}</div>
        <div class="item-text">${MyStatsU.escapeHtml(item.description)}</div>
      </div>
      <div class="item-meta">${MyStatsU.formatDate(item.tanggalHitung)}</div>
    </article>
  `).join("");
}

function recommendationFor(gpa, contributions) {
  const topFeature = contributions[0] ? contributions[0].label.toLowerCase() : "konsistensi belajar";
  if (gpa < 2.5) {
    return `Prioritaskan perbaikan ${topFeature} dan mata kuliah dengan nilai terendah.`;
  }
  if (gpa < 3.5) {
    return `Pertahankan pola yang sudah baik dan tingkatkan ${topFeature} secara bertahap.`;
  }
  return `Performa diproyeksikan sangat baik. Pertahankan ${topFeature} agar hasil tetap stabil.`;
}

async function calculatePrediction() {
  const button = document.getElementById("calculateBtn");
  button.disabled = true;
  button.innerHTML = '<span class="button-spinner"></span>Menghitung...';

  try {
    if (!state.model) await initializeModel();
    button.disabled = true;
    const profile = getFeatureProfile();
    validateProfile(profile);
    saveProfile();
    renderFeatureSummary(profile);

    const normalized = predictionModel.normalizeFeatures(profile.features);
    const gpa = predictionModel.predictGpa(tf, state.model, normalized);
    const category = predictionModel.getCategory(gpa);
    const contributions = predictionModel.analyzeContributions(tf, state.model, normalized);
    const description = `Berdasarkan ${profile.gradeSummary.courseCount} mata kuliah, rata-rata nilai ${profile.features.averageGrade.toFixed(1)}, dan ${profile.features.studyHours.toFixed(1)} jam belajar per minggu, estimasi IPK akhir adalah ${gpa.toFixed(2)}. ${recommendationFor(gpa, contributions)}`;
    const item = {
      ipkPrediksi: gpa,
      category,
      description,
      semester: profile.semester || null,
      courseCount: profile.gradeSummary.courseCount,
      tanggalHitung: new Date().toISOString(),
      contributions,
      features: profile.features
    };

    renderLatest(item);
    renderContributions(contributions);
    renderHistory(saveHistory(item));
    showToast("Prediksi selesai dihitung dengan model TensorFlow.js.");
  } catch (error) {
    console.error(error);
    showToast(error.message || "Prediksi gagal dihitung.", "error");
  } finally {
    button.disabled = state.modelBusy;
    button.innerHTML = '<svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>Prediksi Sekarang';
  }
}

async function loadData() {
  const [gradesResult, studyResult] = await Promise.allSettled([
    MyStatsU.apiJson(`/api/nilai/${userId}`),
    MyStatsU.apiJson(`/api/jam/${userId}`)
  ]);

  if (gradesResult.status === "fulfilled" && Array.isArray(gradesResult.value)) {
    state.grades = gradesResult.value;
  } else {
    state.grades = [];
    showToast("Data nilai database gagal dimuat.", "error");
  }

  if (studyResult.status === "fulfilled" && Array.isArray(studyResult.value)) {
    state.studySessions = studyResult.value;
  } else {
    showToast("Data jam belajar gagal dimuat.", "error");
  }

  populateSemesters();
  renderFeatureSummary(getFeatureProfile());
}

document.getElementById("calculateBtn").addEventListener("click", calculatePrediction);

["attendanceInput", "previousGpaInput", "semesterInput"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    try {
      renderFeatureSummary(getFeatureProfile());
      saveProfile();
    } catch (error) {
      console.error(error);
    }
  });
});

async function init() {
  hydrateProfile();
  const history = readHistory();
  renderHistory(history);
  if (history[0]) {
    renderLatest(history[0]);
    if (Array.isArray(history[0].contributions)) {
      renderContributions(history[0].contributions);
    }
  }
  setButtonsDisabled(true);
  await Promise.all([
    loadData(),
    initializeModel().catch((error) => {
      console.error(error);
      setModelStatus("Model gagal", "error");
      showToast(error.message || "Model gagal disiapkan.", "error");
    })
  ]);
  setButtonsDisabled(state.modelBusy);
}

init().catch((error) => {
  console.error(error);
  showToast(error.message || "Halaman prediksi gagal dimuat.", "error");
});
