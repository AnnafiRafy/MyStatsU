const API = '/api';

  /* ── tab switch ── */
  function switchTab(t) {
    document.querySelectorAll('.tab').forEach((b,i) =>
      b.classList.toggle('active', (t==='login'&&i===0)||(t==='register'&&i===1)));
    document.getElementById('secLogin').classList.toggle('active', t==='login');
    document.getElementById('secReg').classList.toggle('active', t==='register');
    hideAlert();
  }

  /* ── password toggle ── */
  const eyeShow = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeHide = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  function togglePass(id, btn) {
    const inp = document.getElementById(id);
    const shown = btn.dataset.s === '1';
    inp.type = shown ? 'password' : 'text';
    btn.dataset.s = shown ? '0' : '1';
    btn.innerHTML = shown ? eyeShow : eyeHide;
  }

  /* ── alerts ── */
  function showAlert(msg, type, box='alertBox', dot='alertDot', msgEl='alertMsg') {
    const el = document.getElementById(box);
    el.className = `alert show ${type}`;
    document.getElementById(dot).textContent  = type==='success' ? '✓' : '✕';
    document.getElementById(msgEl).textContent = msg;
  }

  function hideAlert() {
    document.getElementById('alertBox').classList.remove('show');
  }

  /* ── loading ── */
  function setLoad(id, on) {
    const b = document.getElementById(id);
    b.classList.toggle('loading', on);
    b.disabled = on;
  }

  /* ── login ── */
  async function doLogin() {
    hideAlert();
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPass').value;
    if (!email||!pass) return showAlert('Email dan password wajib diisi','error');
    setLoad('loginBtn', true);
    try {
      const res  = await fetch(`${API}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
      const data = await res.json();
      if (data.success) { localStorage.setItem('token',data.token); localStorage.setItem('user',JSON.stringify(data.data)); window.location.href='dashboard.html'; }
      else showAlert(data.message||'Login gagal','error');
    } catch { showAlert('Tidak bisa terhubung ke server','error'); }
    finally { setLoad('loginBtn',false); }
  }

  /* ── register ── */
  async function doRegister() {
    hideAlert();
    const nama=document.getElementById('regNama').value.trim(), nim=document.getElementById('regNim').value.trim(),
          email=document.getElementById('regEmail').value.trim(), jurusan=document.getElementById('regJurusan').value,
          pass=document.getElementById('regPass').value;
    if (!nama||!nim||!email||!pass) return showAlert('Semua field wajib diisi','error');
    if (pass.length<6) return showAlert('Password minimal 6 karakter','error');
    setLoad('regBtn',true);
    try {
      const res=await fetch(`${API}/auth/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nama,nim,email,jurusan,password:pass})});
      const data=await res.json();
      if (data.success) { showAlert('Registrasi berhasil! Silakan login.','success'); setTimeout(()=>switchTab('login'),1800); }
      else showAlert(data.message||'Registrasi gagal','error');
    } catch { showAlert('Tidak bisa terhubung ke server','error'); }
    finally { setLoad('regBtn',false); }
  }

  /* ── restore session ── */
  const su=localStorage.getItem('user');
  if (su&&localStorage.getItem('token')) {
    try {
      JSON.parse(su);
      window.location.replace('dashboard.html');
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  /* ── enter key ── */
  document.addEventListener('keydown', e => {
    if (e.key!=='Enter') return;
    if (document.getElementById('secLogin').classList.contains('active')) doLogin();
    else doRegister();
  });
