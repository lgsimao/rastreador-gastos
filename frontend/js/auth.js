/* ═══════════════════════════════════════════════════════════
   AUTH.JS — Lógica da página de login / cadastro
   ═══════════════════════════════════════════════════════════ */

const API_BASE = '/api';

// ─── Troca de aba ────────────────────────────────────────────
function switchTab(tab) {
  const isLogin = tab === 'login';

  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);

  document.getElementById('form-login').style.display    = isLogin ? 'flex' : 'none';
  document.getElementById('form-register').style.display = isLogin ? 'none' : 'flex';

  clearErrors();
}

// ─── LOGIN ───────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  clearErrors();

  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const btn   = document.getElementById('btn-login');

  setLoading(btn, true);

  try {
    const res  = await fetch(`${API_BASE}/auth/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      showError('login-error', data.error || 'Erro ao fazer login.');
      return;
    }

    // Salva token e dados do usuário
    localStorage.setItem('rg_token', data.token);
    localStorage.setItem('rg_nome',  data.nome);
    localStorage.setItem('rg_email', data.email);

    // Redireciona para o sistema
    window.location.href = '/index.html';

  } catch {
    showError('login-error', 'Não foi possível conectar ao servidor. Verifique se ele está rodando.');
  } finally {
    setLoading(btn, false);
  }
}

// ─── CADASTRO ────────────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  clearErrors();

  const nome     = document.getElementById('reg-nome').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const senha    = document.getElementById('reg-senha').value;
  const confirma = document.getElementById('reg-confirma').value;
  const btn      = document.getElementById('btn-register');

  if (senha !== confirma) {
    showError('register-error', 'As senhas não coincidem.');
    return;
  }

  if (senha.length < 6) {
    showError('register-error', 'A senha deve ter pelo menos 6 caracteres.');
    return;
  }

  setLoading(btn, true);

  try {
    const res  = await fetch(`${API_BASE}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nome, email, senha })
    });

    const data = await res.json();

    if (!res.ok) {
      showError('register-error', data.error || 'Erro ao criar conta.');
      return;
    }

    localStorage.setItem('rg_token', data.token);
    localStorage.setItem('rg_nome',  data.nome);
    localStorage.setItem('rg_email', data.email);

    window.location.href = '/index.html';

  } catch {
    showError('register-error', 'Não foi possível conectar ao servidor.');
  } finally {
    setLoading(btn, false);
  }
}

// ─── Mostrar/ocultar senha ───────────────────────────────────
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// ─── Força da senha ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const senhaInput = document.getElementById('reg-senha');
  if (!senhaInput) return;

  senhaInput.addEventListener('input', () => {
    const val  = senhaInput.value;
    const bar  = document.getElementById('password-strength');
    if (!bar) return;

    let score = 0;
    if (val.length >= 6)  score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
      { pct: '0%',   color: 'transparent' },
      { pct: '25%',  color: '#ef4444' },
      { pct: '50%',  color: '#f59e0b' },
      { pct: '75%',  color: '#3b82f6' },
      { pct: '100%', color: '#10b981' }
    ];

    const level = levels[Math.min(score, 4)];
    bar.style.setProperty('--strength',       level.pct);
    bar.style.setProperty('--strength-color', level.color);
  });

  // Se já está autenticado, vai direto pro sistema
  if (localStorage.getItem('rg_token')) {
    window.location.href = '/index.html';
  }
});

// ─── Utilitários ─────────────────────────────────────────────
function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function clearErrors() {
  document.querySelectorAll('.auth-error').forEach(el => {
    el.style.display = 'none';
    el.textContent   = '';
  });
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.querySelector('.btn-text').style.display   = loading ? 'none'  : 'inline';
  btn.querySelector('.btn-loader').style.display = loading ? 'inline' : 'none';
}
