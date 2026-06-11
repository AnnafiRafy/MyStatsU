(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MyStatsUPredictionModel = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MODEL_VERSION = 1;
  const SAMPLE_COUNT = 180;
  const EPOCHS = 80;
  const FEATURE_DEFINITIONS = [
    { key: "studyHours", label: "Jam belajar", unit: "jam/minggu" },
    { key: "attendance", label: "Kehadiran", unit: "%" },
    { key: "consistency", label: "Konsistensi", unit: "%" },
    { key: "previousGpa", label: "IPK semester lalu", unit: "" },
    { key: "averageGrade", label: "Rata-rata nilai", unit: "" }
  ];

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generateSyntheticDataset(count = SAMPLE_COUNT, seed = 20250611) {
    const random = seededRandom(seed);
    const inputs = [];
    const labels = [];

    for (let index = 0; index < count; index += 1) {
      const studyHours = clamp(0.08 + random() * 0.92);
      const attendance = clamp(0.45 + random() * 0.55);
      const consistency = clamp((studyHours * 0.35) + (random() * 0.65));
      const previousGpa = clamp(0.25 + random() * 0.75);
      const averageGrade = clamp((previousGpa * 0.38) + (random() * 0.62));
      const noise = (random() - 0.5) * 0.07;
      const normalizedGpa = clamp(
        0.08 +
        (studyHours * 0.12) +
        (attendance * 0.15) +
        (consistency * 0.16) +
        (previousGpa * 0.25) +
        (averageGrade * 0.20) +
        (studyHours * consistency * 0.04) +
        noise
      );

      inputs.push([studyHours, attendance, consistency, previousGpa, averageGrade]);
      labels.push([normalizedGpa]);
    }

    return { inputs, labels };
  }

  function normalizeFeatures(profile) {
    return [
      clamp(profile.studyHours / 30),
      clamp(profile.attendance / 100),
      clamp(profile.consistency / 100),
      clamp(profile.previousGpa / 4),
      clamp(profile.averageGrade / 100)
    ];
  }

  function parseDateOnly(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    const [year, month, day] = String(value).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function summarizeStudySessions(items, now = new Date()) {
    const today = startOfDay(now);
    const periodStart = new Date(today);
    periodStart.setDate(periodStart.getDate() - 27);

    const activeDates = new Set();
    const weeklyMinutes = [0, 0, 0, 0];
    let totalMinutes = 0;

    (Array.isArray(items) ? items : []).forEach((item) => {
      const date = parseDateOnly(item.tanggal);
      const duration = Math.max(0, Number(item.durasi) || 0);
      if (!date || date < periodStart || date > today || duration <= 0) return;

      const daysAgo = Math.floor((today - date) / 86400000);
      const weekIndex = 3 - Math.min(3, Math.floor(daysAgo / 7));
      totalMinutes += duration;
      weeklyMinutes[weekIndex] += duration;
      activeDates.add(String(item.tanggal));
    });

    const weeklyHours = weeklyMinutes.map((minutes) => minutes / 60);
    const earlyAverage = (weeklyHours[0] + weeklyHours[1]) / 2;
    const recentAverage = (weeklyHours[2] + weeklyHours[3]) / 2;
    const trendHours = recentAverage - earlyAverage;
    const regularityScore = clamp(activeDates.size / 16);
    const trendScore = clamp(0.5 + (trendHours / 10));
    const consistency = (regularityScore * 0.7 + trendScore * 0.3) * 100;

    return {
      activeDays: activeDates.size,
      consistency,
      hoursPerWeek: (totalMinutes / 60) / 4,
      totalHours: totalMinutes / 60,
      trendHours,
      weeklyHours
    };
  }

  function gradePoint(score) {
    const value = Number(score) || 0;
    if (value >= 85) return 4;
    if (value >= 80) return 3.5;
    if (value >= 75) return 3;
    if (value >= 70) return 2.5;
    if (value >= 60) return 2;
    if (value >= 50) return 1;
    return 0;
  }

  function summarizeGrades(items, semester) {
    const allItems = Array.isArray(items) ? items : [];
    const filtered = semester
      ? allItems.filter((item) => String(item.semester || "") === String(semester))
      : allItems;

    let scoreTotal = 0;
    let weightedPoints = 0;
    let totalCredits = 0;

    filtered.forEach((item) => {
      const score = clamp(Number(item.nilai_angka), 0, 100);
      const credits = Math.max(0, Number(item.sks) || 0);
      scoreTotal += score;
      weightedPoints += gradePoint(score) * credits;
      totalCredits += credits;
    });

    return {
      averageGrade: filtered.length ? scoreTotal / filtered.length : 0,
      courseCount: filtered.length,
      currentGpa: totalCredits ? weightedPoints / totalCredits : 0,
      items: filtered,
      totalCredits
    };
  }

  function getCategory(gpa) {
    if (gpa >= 3.75) return "Cumlaude";
    if (gpa >= 3.5) return "Sangat Memuaskan";
    if (gpa >= 3) return "Memuaskan";
    if (gpa >= 2.5) return "Cukup Baik";
    return "Perlu Peningkatan";
  }

  function createModel(tf) {
    const model = tf.sequential();
    model.add(tf.layers.dense({
      inputShape: [FEATURE_DEFINITIONS.length],
      units: 10,
      activation: "relu",
      kernelInitializer: tf.initializers.glorotUniform({ seed: 17 }),
      biasInitializer: "zeros"
    }));
    model.add(tf.layers.dense({
      units: 1,
      activation: "sigmoid",
      kernelInitializer: tf.initializers.glorotUniform({ seed: 29 }),
      biasInitializer: "zeros"
    }));
    model.compile({
      optimizer: tf.train.adam(0.02),
      loss: "meanSquaredError",
      metrics: ["mae"]
    });
    return model;
  }

  function modelStorageUrl(userId) {
    return `localstorage://mystatsu-ipk-v${MODEL_VERSION}-user-${userId}`;
  }

  function metadataStorageKey(userId) {
    return `mystatsuIpkModelMeta:v${MODEL_VERSION}:${userId}`;
  }

  async function trainModel(tf, options = {}) {
    if (!tf) throw new Error("TensorFlow.js belum tersedia.");
    await tf.ready();

    const startedAt = performance.now();
    const dataset = generateSyntheticDataset(SAMPLE_COUNT);
    const model = createModel(tf);
    const xs = tf.tensor2d(dataset.inputs, [SAMPLE_COUNT, FEATURE_DEFINITIONS.length]);
    const ys = tf.tensor2d(dataset.labels, [SAMPLE_COUNT, 1]);

    try {
      const history = await model.fit(xs, ys, {
        epochs: EPOCHS,
        batchSize: 18,
        validationSplit: 0.15,
        shuffle: true,
        verbose: 0,
        callbacks: {
          onEpochEnd(epoch, logs) {
            if (typeof options.onEpochEnd === "function") {
              options.onEpochEnd(epoch + 1, logs || {});
            }
          }
        }
      });

      const losses = history.history.loss || [];
      const meanAbsoluteErrors = history.history.mae || history.history.meanAbsoluteError || [];
      return {
        model,
        durationMs: performance.now() - startedAt,
        finalLoss: Number(losses[losses.length - 1]) || 0,
        finalMae: Number(meanAbsoluteErrors[meanAbsoluteErrors.length - 1]) || 0
      };
    } catch (error) {
      model.dispose();
      throw error;
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  async function saveModel(tf, model, userId, trainingInfo) {
    const url = modelStorageUrl(userId);
    await model.save(url);
    const metadata = {
      version: MODEL_VERSION,
      samples: SAMPLE_COUNT,
      epochs: EPOCHS,
      durationMs: Number(trainingInfo.durationMs) || 0,
      finalLoss: Number(trainingInfo.finalLoss) || 0,
      finalMae: Number(trainingInfo.finalMae) || 0,
      trainedAt: new Date().toISOString()
    };
    localStorage.setItem(metadataStorageKey(userId), JSON.stringify(metadata));
    return metadata;
  }

  async function loadModel(tf, userId) {
    if (!tf) throw new Error("TensorFlow.js belum tersedia.");
    await tf.ready();
    const url = modelStorageUrl(userId);
    const models = await tf.io.listModels();
    if (!models[url]) return null;

    const model = await tf.loadLayersModel(url);
    let metadata = null;
    try {
      metadata = JSON.parse(localStorage.getItem(metadataStorageKey(userId)) || "null");
    } catch {
      metadata = null;
    }
    return { model, metadata };
  }

  async function removeSavedModel(tf, userId) {
    const url = modelStorageUrl(userId);
    const models = await tf.io.listModels();
    if (models[url]) await tf.io.removeModel(url);
    localStorage.removeItem(metadataStorageKey(userId));
  }

  function predictNormalized(tf, model, normalizedFeatures) {
    return tf.tidy(() => {
      const input = tf.tensor2d([normalizedFeatures], [1, FEATURE_DEFINITIONS.length]);
      const output = model.predict(input);
      return clamp(output.dataSync()[0]);
    });
  }

  function predictGpa(tf, model, normalizedFeatures) {
    return clamp(predictNormalized(tf, model, normalizedFeatures) * 4, 0, 4);
  }

  function analyzeContributions(tf, model, normalizedFeatures) {
    const delta = 0.12;
    const sensitivities = FEATURE_DEFINITIONS.map((feature, index) => {
      const lower = normalizedFeatures.slice();
      const upper = normalizedFeatures.slice();
      lower[index] = clamp(lower[index] - delta);
      upper[index] = clamp(upper[index] + delta);
      const span = upper[index] - lower[index];
      const effect = span
        ? Math.abs(predictNormalized(tf, model, upper) - predictNormalized(tf, model, lower)) / span
        : 0;
      return { ...feature, effect };
    });

    const total = sensitivities.reduce((sum, item) => sum + item.effect, 0);
    return sensitivities
      .map((item) => ({
        ...item,
        percentage: total ? (item.effect / total) * 100 : 20
      }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  return {
    EPOCHS,
    FEATURE_DEFINITIONS,
    MODEL_VERSION,
    SAMPLE_COUNT,
    analyzeContributions,
    clamp,
    generateSyntheticDataset,
    getCategory,
    loadModel,
    modelStorageUrl,
    normalizeFeatures,
    predictGpa,
    removeSavedModel,
    saveModel,
    summarizeGrades,
    summarizeStudySessions,
    trainModel
  };
});
