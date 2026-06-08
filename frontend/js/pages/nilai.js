const session = MyStatsUAuth.requireAuth();
  const userId = session.user.mahasiswaID || session.user.id;

  const gradePoint = { A:4, AB:3.5, B:3, BC:2.5, C:2, D:1, E:0 };
  const defaultCourses = [
    { mata_kuliah: 'Pemrograman Web', sks: 3, semester: 'Genap 2024/2025' },
    { mata_kuliah: 'Basis Data Lanjut', sks: 3, semester: 'Genap 2024/2025' },
    { mata_kuliah: 'Jaringan Komputer', sks: 3, semester: 'Genap 2024/2025' },
    { mata_kuliah: 'Kecerdasan Buatan', sks: 3, semester: 'Genap 2024/2025' },
    { mata_kuliah: 'Pengembangan Aplikasi Mobile', sks: 3, semester: 'Genap 2024/2025' },
    { mata_kuliah: 'Rekayasa Perangkat Lunak', sks: 3, semester: 'Genap 2024/2025' }
  ];
  let nilaiState = {
    data: [],
    filter: 'all',
    editingId: null
  };

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

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[char]));
  }

  function ensureFeedbackUi() {
    if (!document.getElementById('toastStack')) {
      document.body.insertAdjacentHTML('beforeend', '<div class="toast-stack" id="toastStack" aria-live="polite" aria-atomic="true"></div>');
    }

    if (!document.getElementById('confirmOverlay')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="confirm-overlay" id="confirmOverlay" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
          <div class="confirm-card">
            <div class="confirm-icon">
              <svg viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div class="confirm-title" id="confirmTitle">Hapus data nilai?</div>
            <div class="confirm-text" id="confirmText">Data yang sudah dihapus tidak bisa dikembalikan.</div>
            <div class="confirm-actions">
              <button type="button" class="confirm-btn cancel" id="confirmCancel">Batal</button>
              <button type="button" class="confirm-btn danger" id="confirmOk">Hapus</button>
            </div>
          </div>
        </div>
      `);
    }
  }

  function showToast(message, type = 'success', title) {
    ensureFeedbackUi();

    const stack = document.getElementById('toastStack');
    const toast = document.createElement('div');
    const icon = type === 'success'
      ? '<path d="M20 6 9 17l-5-5"/>'
      : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';

    toast.className = `app-toast ${type}`;
    toast.innerHTML = `
      <div class="toast-ico"><svg viewBox="0 0 24 24">${icon}</svg></div>
      <div>
        <div class="toast-title">${escapeHtml(title || (type === 'success' ? 'Berhasil' : 'Perlu dicek'))}</div>
        <div class="toast-msg">${escapeHtml(message)}</div>
      </div>
    `;
    stack.appendChild(toast);

    window.setTimeout(() => {
      toast.style.animation = 'toastOut .2s ease forwards';
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, 2800);
  }

  function showConfirm({ title, message, confirmText = 'Hapus', cancelText = 'Batal' }) {
    ensureFeedbackUi();

    const overlay = document.getElementById('confirmOverlay');
    const ok = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = message;
    ok.textContent = confirmText;
    cancel.textContent = cancelText;
    overlay.classList.add('show');

    return new Promise(resolve => {
      const cleanup = (value) => {
        overlay.classList.remove('show');
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKeydown);
        resolve(value);
      };
      const onOk = () => cleanup(true);
      const onCancel = () => cleanup(false);
      const onOverlay = (event) => {
        if (event.target === overlay) cleanup(false);
      };
      const onKeydown = (event) => {
        if (event.key === 'Escape') cleanup(false);
      };

      ok.addEventListener('click', onOk);
      cancel.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKeydown);
      ok.focus();
    });
  }

  function gradeClass(grade) {
    const clean = String(grade || '').toUpperCase();
    return ['A','AB','B','BC','C','D'].includes(clean) ? `grade-${clean}` : 'grade-C';
  }

  function hitungIpk(data) {
    let totalBobot = 0;
    let totalSks = 0;

    data.forEach(item => {
      const sks = Number(item.sks) || 0;
      const grade = String(item.grade || gradeFromNilai(item.nilai_angka)).toUpperCase();
      const point = gradePoint[grade];
      if (!sks || point === undefined) return;
      totalBobot += sks * point;
      totalSks += sks;
    });

    return {
      ipk: totalSks ? (totalBobot / totalSks).toFixed(2) : '0.00',
      sks: totalSks
    };
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

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error((payload && payload.message) || `Request gagal: ${response.status}`);
    }

    return payload;
  }

  function normalizedName(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getMissingCourses(nilaiData) {
    const savedNames = new Set(nilaiData.map(item => normalizedName(item.mata_kuliah)));
    return defaultCourses.filter(item => !savedNames.has(normalizedName(item.mata_kuliah)));
  }

  function visibleNilaiRows() {
    if (nilaiState.filter === 'done') return nilaiState.data;
    if (nilaiState.filter === 'missing') return getMissingCourses(nilaiState.data).map(item => ({ ...item, missing: true }));
    return [
      ...nilaiState.data,
      ...getMissingCourses(nilaiState.data).map(item => ({ ...item, missing: true }))
    ];
  }

  function renderNilai() {
    const tbody = document.getElementById('nilaiTableBody');
    const rows = visibleNilaiRows();

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;color:var(--muted);padding:34px 16px;font-weight:600;">
            Tidak ada data untuk filter ini.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map(item => {
      if (item.missing) {
        return `
          <tr style="opacity:.62">
            <td>
              <div class="mk-name-cell">${escapeHtml(item.mata_kuliah || '-')}</div>
            <div class="mk-sub-cell">${escapeHtml(item.kelas || session.user.jurusan || 'Belum input')}</div>
            </td>
            <td><span style="font-weight:700;color:var(--text)">${escapeHtml(item.sks || 0)}</span> <span style="font-size:11px;color:var(--muted)">SKS</span></td>
            <td><span style="font-size:11px;background:var(--off);border:1px dashed var(--border-med);border-radius:6px;padding:4px 8px;color:var(--muted);font-weight:600;">Belum</span></td>
            <td><span style="font-size:12px;color:var(--muted)">belum diinput</span></td>
            <td><span style="font-size:12px;color:var(--muted)">${escapeHtml(item.semester || 'Input manual')}</span></td>
            <td>
              <button class="action-btn" onclick='openModalForCourse(${JSON.stringify(item.mata_kuliah || '')}, ${Number(item.sks) || 3}, ${JSON.stringify(item.semester || '')})' style="color:var(--red);opacity:1" title="Input nilai">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </td>
          </tr>
        `;
      }

      const nilai = Number(item.nilai_angka) || 0;
      const grade = String(item.grade || gradeFromNilai(item.nilai_angka)).toUpperCase();
      const nilaiId = item.nilaiID || item.id;

      return `
        <tr>
          <td>
            <div class="mk-name-cell">${escapeHtml(item.mata_kuliah || '-')}</div>
            <div class="mk-sub-cell">${escapeHtml(item.kelas || session.user.jurusan || 'Data input')}</div>
          </td>
          <td><span style="font-weight:700;color:var(--text)">${escapeHtml(item.sks || 0)}</span> <span style="font-size:11px;color:var(--muted)">SKS</span></td>
          <td><span class="grade-badge ${gradeClass(grade)}">${escapeHtml(grade)}</span></td>
          <td>
            <div class="nilai-bar-wrap">
              <div class="nilai-bar"><div class="nilai-fill" style="width:${Math.max(0, Math.min(100, nilai))}%"></div></div>
              <div class="nilai-num">${escapeHtml(nilai)}</div>
            </div>
          </td>
          <td><span style="font-size:12px;color:var(--muted)">${escapeHtml(item.semester || 'Input manual')}</span></td>
          <td>
            <button class="action-btn" onclick="editNilai(${Number(nilaiId)})" title="Edit nilai"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
            <button class="action-btn" onclick="hapusNilai(${Number(nilaiId)})" title="Hapus nilai"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  async function loadNilai() {
    try {
      const nilaiData = await apiJson(`/api/nilai/${userId}`);
      if (!nilaiData) return;
      nilaiState.data = Array.isArray(nilaiData) ? nilaiData : [];

      const summary = hitungIpk(nilaiState.data);
      document.querySelector('.ipk-value').textContent = summary.ipk;

      const missingCount = getMissingCourses(nilaiState.data).length;
      const statValues = document.querySelectorAll('.ipk-stat-val');
      if (statValues[0]) statValues[0].textContent = summary.sks;
      if (statValues[1]) statValues[1].textContent = nilaiState.data.length;
      if (statValues[2]) statValues[2].textContent = missingCount;

      const topbarSub = document.querySelector('.topbar-sub');
      if (topbarSub) topbarSub.textContent = `Semester Genap 2024/2025 · ${nilaiState.data.length} mata kuliah sudah diinput`;

      renderNilai();
    } catch(error) {
      console.log(error);
      showToast('Gagal memuat data nilai', 'error');
    }
  }

  function resetNilaiForm() {
    nilaiState.editingId = null;
    document.querySelector('.modal-title').textContent = 'Input Nilai';
    document.getElementById('modalSub').textContent = 'Tambahkan nilai mata kuliah semester ini';
    document.getElementById('saveNilaiBtn').textContent = 'Simpan Nilai';
    document.getElementById("mk").value = "";
    document.getElementById("kelas").value = "";
    document.getElementById("nilai").value = "";
    document.getElementById("sks").value = "3 SKS";
    document.getElementById("semester").value = "Genap 2024/2025";
    document.querySelectorAll('.grade-opt').forEach(o=>o.classList.remove('sel'));
    const firstGrade = document.querySelector('.grade-opt');
    if (firstGrade) firstGrade.classList.add('sel');
    clearNilaiValidation();
  }

  function openModal()  {
    resetNilaiForm();
    document.getElementById('modalOverlay').classList.add('show');
  }

  function openModalForCourse(mataKuliah, sks = 3, semester = 'Genap 2024/2025') {
    openModal();
    document.getElementById("mk").value = mataKuliah;
    document.getElementById("sks").value = `${sks} SKS`;
    if (semester) document.getElementById("semester").value = semester;
  }

  function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
  document.getElementById('modalOverlay').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });
  function selectGrade(el) {
    document.querySelectorAll('.grade-opt').forEach(o=>o.classList.remove('sel'));
    el.classList.add('sel');
    setFieldError('grade', '');
  }

  function setFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(`${fieldId}Error`);
    if (field) {
      field.classList.toggle('field-invalid', Boolean(message));
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    if (error) error.textContent = message || '';
  }

  function clearNilaiValidation() {
    ['mk', 'kelas', 'sks', 'semester', 'nilai', 'grade'].forEach(fieldId => setFieldError(fieldId, ''));
  }

  function validateNilaiForm({ mataKuliah, kelas, sks, nilaiRaw, nilaiAngka, semester, grade }) {
    clearNilaiValidation();
    const errors = [];

    if (!mataKuliah) errors.push(['mk', 'Mata kuliah harus diisi.']);
    if (!kelas) errors.push(['kelas', 'Kelas harus diisi.']);
    if (!Number.isInteger(sks) || sks < 1) errors.push(['sks', 'SKS harus dipilih.']);
    if (!semester) errors.push(['semester', 'Semester harus diisi.']);
    if (!grade) errors.push(['grade', 'Grade harus dipilih.']);
    if (!nilaiRaw) {
      errors.push(['nilai', 'Nilai angka harus diisi.']);
    } else if (Number.isNaN(nilaiAngka) || nilaiAngka < 0 || nilaiAngka > 100) {
      errors.push(['nilai', 'Nilai angka harus 0 sampai 100.']);
    }

    errors.forEach(([fieldId, message]) => setFieldError(fieldId, message));

    if (errors.length) {
      const firstField = document.getElementById(errors[0][0]);
      if (firstField) firstField.focus();
      showToast('Semua field wajib diisi sesuai ketentuan.', 'error');
      return false;
    }

    return true;
  }

  function editNilai(nilaiId) {
    const item = nilaiState.data.find(row => Number(row.nilaiID || row.id) === Number(nilaiId));
    if (!item) return;

    nilaiState.editingId = nilaiId;
    document.querySelector('.modal-title').textContent = 'Edit Nilai';
    document.getElementById('modalSub').textContent = 'Ubah data nilai yang sudah diinput';
    document.getElementById('saveNilaiBtn').textContent = 'Simpan Perubahan';
    document.getElementById("mk").value = item.mata_kuliah || "";
    document.getElementById("kelas").value = item.kelas || "";
    document.getElementById("sks").value = `${Number(item.sks) || 3} SKS`;
    document.getElementById("semester").value = item.semester || "Genap 2024/2025";
    document.getElementById("nilai").value = item.nilai_angka ?? "";
    clearNilaiValidation();

    const grade = String(item.grade || gradeFromNilai(item.nilai_angka)).toUpperCase();
    document.querySelectorAll('.grade-opt').forEach(o => {
      o.classList.toggle('sel', o.childNodes[0].textContent.trim() === grade);
    });
    document.getElementById('modalOverlay').classList.add('show');
  }

  async function hapusNilai(nilaiId) {
    const shouldDelete = await showConfirm({
      title: 'Hapus data nilai?',
      message: 'Nilai mata kuliah ini akan dihapus dari daftar dan perhitungan IPK.',
      confirmText: 'Hapus Nilai'
    });
    if (!shouldDelete) return;

    try {
      await apiJson(`/api/nilai/${nilaiId}`, { method: "DELETE" });
      await loadNilai();
      showToast('Data nilai berhasil dihapus.', 'success', 'Nilai dihapus');
    } catch (error) {
      console.log(error);
      showToast(error.message || "Gagal menghapus nilai", 'error');
    }
  }

  async function simpanNilai(){
    const wasEditing = Boolean(nilaiState.editingId);

    const gradeDipilih = document.querySelector('.grade-opt.sel');
    const mataKuliah = document.getElementById("mk").value.trim();
    const kelas = document.getElementById("kelas").value.trim();
    const sks = parseInt(document.getElementById("sks").value, 10);
    const nilaiRaw = document.getElementById("nilai").value.trim();
    const nilaiAngka = Number(nilaiRaw);
    const semester = document.getElementById("semester").value.trim();
    const grade = gradeDipilih ? gradeDipilih.childNodes[0].textContent.trim() : '';

    if (!validateNilaiForm({ mataKuliah, kelas, sks, nilaiRaw, nilaiAngka, semester, grade })) {
      return;
    }

    const data = {
      user_id: userId,
      mata_kuliah: mataKuliah,
      sks,
      nilai_angka: nilaiAngka,
      semester,
      kelas,
      tanggalInput: new Date().toISOString().slice(0, 10),
      grade
    };

    try {
      const saveBtn = document.getElementById('saveNilaiBtn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';

      const url = nilaiState.editingId ? `/api/nilai/${nilaiState.editingId}` : "/api/nilai";
      const result = await apiJson(url, {
        method: nilaiState.editingId ? "PUT" : "POST",
        headers: {
          "Content-Type":"application/json"
        },
        body: JSON.stringify(data)
      });

      if (!result) return;

      showToast(
        wasEditing ? 'Perubahan nilai berhasil disimpan.' : 'Nilai baru berhasil ditambahkan.',
        'success',
        'Nilai tersimpan'
      );

      closeModal();

      resetNilaiForm();
      await loadNilai();

    } catch(error){

      console.log(error);

      showToast(error.message || "Gagal simpan data", 'error');

    } finally {
      const saveBtn = document.getElementById('saveNilaiBtn');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = wasEditing ? 'Simpan Perubahan' : 'Simpan Nilai';
      }
    }

  }

  document.querySelectorAll('[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(item => item.classList.remove('active'));
      chip.classList.add('active');
      nilaiState.filter = chip.dataset.filter;
      renderNilai();
    });
  });

  ['mk', 'kelas', 'sks', 'semester', 'nilai'].forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field) return;
    field.addEventListener('input', () => setFieldError(fieldId, ''));
    field.addEventListener('change', () => setFieldError(fieldId, ''));
  });

  MyStatsU.syncNotificationBadge();
  loadNilai();
