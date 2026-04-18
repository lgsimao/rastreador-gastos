/* ═══════════════════════════════════════════════════════════
   APP.JS — Estado, API, Formulário, Navegação, Auth
   ═══════════════════════════════════════════════════════════ */

const API_BASE = '/api';

// ─── Verificação de autenticação ─────────────────────────────
// Redireciona para login se não houver token
(function checkAuth() {
  const token = localStorage.getItem('rg_token');
  if (!token) window.location.replace('/login.html');
})();

// ─── Estado global ───────────────────────────────────────────
const state = {
  gastos: [],
  config: {
    saldo_inicial:       3000,
    limite_mensal:       2000,
    limite_alimentacao:  600,
    limite_lazer:        400,
    limite_transporte:   500,
    limite_contas:       800,
    limite_outros:       300
  },
  mesAtual:        new Date().getMonth() + 1,
  anoAtual:        new Date().getFullYear(),
  filtroCategoria: 'todos'
};

// Metadados de categorias
const CATEGORIAS = {
  alimentacao: { label: 'Alimentação', icon: '🍽️', color: '#f59e0b' },
  transporte:  { label: 'Transporte',  icon: '🚗', color: '#3b82f6' },
  lazer:       { label: 'Lazer',       icon: '🎮', color: '#8b5cf6' },
  contas:      { label: 'Contas',      icon: '📄', color: '#ef4444' },
  outros:      { label: 'Outros',      icon: '📦', color: '#6b7280' }
};

const FORMAS = {
  dinheiro: { label: 'Dinheiro', cssClass: 'pagamento-dinheiro' },
  debito:   { label: 'Débito',   cssClass: 'pagamento-debito'   },
  credito:  { label: 'Crédito',  cssClass: 'pagamento-credito'  }
};

// ─── Header de autenticação ──────────────────────────────────
function authHeader() {
  return { 'Authorization': `Bearer ${localStorage.getItem('rg_token')}` };
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers || {})
    }
  });

  // Token expirado ou inválido
  if (res.status === 401) {
    logout();
    throw new Error('Sessão expirada');
  }

  return res;
}

// ─── INIT ────────────────────────────────────────────────────
async function init() {
  setupUserInfo();
  setupNavigation();
  setupMonthSelector();
  setupForm();
  setupConfigForm();
  await loadData();
}

function setupUserInfo() {
  const nome  = localStorage.getItem('rg_nome')  || '';
  const email = localStorage.getItem('rg_email') || '';

  setText('user-name',  nome || 'Usuário');
  setText('user-email', email);

  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl && nome) avatarEl.textContent = nome.charAt(0).toUpperCase();
}

// ─── Logout ──────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('rg_token');
  localStorage.removeItem('rg_nome');
  localStorage.removeItem('rg_email');
  window.location.replace('/login.html');
}

// ─── Reset (Zerar Tudo) ──────────────────────────────────────
function resetAllGastos() {
  const total = state.gastos.length;
  setText('modal-count', total > 0 ? `${total} gasto${total !== 1 ? 's' : ''}` : 'seus gastos');
  document.getElementById('modal-reset').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-reset').style.display = 'none';
}

async function confirmarReset() {
  const btn = document.getElementById('btn-confirmar-reset');
  btn.disabled = true;
  btn.textContent = 'Apagando...';

  try {
    const res = await apiFetch(`${API_BASE}/gastos/all`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    closeModal();
    showToast(`🗑️ ${data.removidos} gastos removidos. Começando do zero!`, 'success');

    await fetchGastos();
    renderAll();
  } catch (err) {
    showToast('Erro ao zerar gastos: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sim, apagar tudo';
  }
}

// ─── Carregamento de dados ───────────────────────────────────
async function loadData() {
  try {
    await Promise.all([fetchGastos(), fetchConfig()]);
    renderAll();
  } catch (err) {
    if (err.message !== 'Sessão expirada') {
      showToast('Erro ao carregar dados. Verifique se o servidor está rodando.', 'error');
    }
    console.error(err);
  }
}

async function fetchGastos() {
  const res = await apiFetch(`${API_BASE}/gastos?mes=${state.mesAtual}&ano=${state.anoAtual}`);
  if (!res.ok) throw new Error('Falha ao buscar gastos');
  state.gastos = await res.json();
}

async function fetchConfig() {
  const res = await apiFetch(`${API_BASE}/gastos/config`);
  if (!res.ok) throw new Error('Falha ao buscar configurações');
  state.config = await res.json();
}

// ─── Renderização geral ──────────────────────────────────────
function renderAll() {
  updateDashboardCards();
  renderGastosList();
  renderCreditSection();
  renderAlertasSection();
  renderSugestoesSection();
  renderCategoryChart();
  renderTrendChart();
  updateConfigForm();
}

// ─── Cards do Dashboard ──────────────────────────────────────
function updateDashboardCards() {
  const totalMes      = state.gastos.reduce((s, g) => s + g.valor, 0);
  const totalCredito  = state.gastos
    .filter(g => g.forma_pagamento === 'credito')
    .reduce((s, g) => s + g.valor, 0);
  const saldoRestante = (state.config.saldo_inicial || 0) - totalMes;

  const porCat = {};
  state.gastos.forEach(g => { porCat[g.categoria] = (porCat[g.categoria] || 0) + g.valor; });
  const top = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];

  setText('card-total-mes', formatCurrency(totalMes));
  setText('card-credito',   formatCurrency(totalCredito));

  const saldoEl = document.getElementById('card-saldo');
  if (saldoEl) {
    saldoEl.textContent = formatCurrency(saldoRestante);
    saldoEl.className   = 'card-value ' +
      (saldoRestante < 0 ? 'danger'
        : saldoRestante < (state.config.saldo_inicial || 1) * 0.15 ? 'warning'
        : 'success');
  }

  setText('card-top-categoria',     top ? (CATEGORIAS[top[0]]?.icon + ' ' + (CATEGORIAS[top[0]]?.label || top[0])) : '—');
  setText('card-top-categoria-sub', top ? formatCurrency(top[1]) : '');

  const limite = state.config.limite_mensal || 1;
  const pct    = Math.min((totalMes / limite) * 100, 100);

  const progressEl = document.getElementById('limite-progress');
  if (progressEl) {
    progressEl.style.width      = pct + '%';
    progressEl.style.background = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981';
  }

  setText('limite-label', `${formatCurrency(totalMes)} de ${formatCurrency(limite)} (${pct.toFixed(0)}%)`);
  setText('gastos-count', `${state.gastos.length} gasto${state.gastos.length !== 1 ? 's' : ''} no período`);
}

// ─── Lista de gastos ─────────────────────────────────────────
function renderGastosList() {
  const container = document.getElementById('gastos-list');
  if (!container) return;

  let lista = state.gastos;
  if (state.filtroCategoria !== 'todos') {
    lista = lista.filter(g => g.categoria === state.filtroCategoria);
  }

  if (lista.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <p>Nenhum gasto encontrado</p>
        <p style="font-size:12px;margin-top:4px">Adicione seu primeiro gasto!</p>
      </div>`;
    return;
  }

  container.innerHTML = lista.map(buildExpenseItem).join('');
}

function buildExpenseItem(g) {
  const cat  = CATEGORIAS[g.categoria] || { label: g.categoria, icon: '📦', color: '#6b7280' };
  const pgmt = FORMAS[g.forma_pagamento] || { label: g.forma_pagamento, cssClass: '' };

  return `
    <div class="expense-item" id="gasto-${g.id}">
      <div class="expense-icon" style="background:${cat.color}22; color:${cat.color}">
        ${cat.icon}
      </div>
      <div class="expense-info">
        <div class="expense-desc">${escapeHtml(g.descricao || cat.label)}</div>
        <div class="expense-meta">${cat.label} &bull; ${formatDate(g.data)}</div>
      </div>
      <div class="expense-right">
        <div class="expense-valor">${formatCurrency(g.valor)}</div>
        <span class="expense-pagamento ${pgmt.cssClass}">${pgmt.label}</span>
      </div>
      <button class="expense-delete" onclick="deleteGasto(${g.id})" title="Remover gasto">🗑️</button>
    </div>`;
}

// ─── Adicionar gasto ─────────────────────────────────────────
function setupForm() {
  const form      = document.getElementById('form-gasto');
  const dateInput = document.getElementById('gasto-data');
  if (dateInput) dateInput.value = todayISO();
  if (!form) return;

  form.addEventListener('reset', () => {
    setTimeout(() => {
      const d = document.getElementById('gasto-data');
      if (d) d.value = todayISO();
    }, 0);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      valor:           parseFloat(document.getElementById('gasto-valor').value),
      categoria:       document.getElementById('gasto-categoria').value,
      descricao:       document.getElementById('gasto-descricao').value.trim(),
      forma_pagamento: document.getElementById('gasto-pagamento').value,
      data:            document.getElementById('gasto-data').value
    };

    if (!payload.valor || payload.valor <= 0) {
      showToast('Insira um valor maior que zero.', 'error'); return;
    }

    try {
      const res = await apiFetch(`${API_BASE}/gastos`, {
        method: 'POST',
        body:   JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro desconhecido');
      }

      showToast('✅ Gasto adicionado!', 'success');
      form.reset();

      const [gAno, gMes] = payload.data.split('-').map(Number);
      if (gMes === state.mesAtual && gAno === state.anoAtual) {
        await fetchGastos();
        renderAll();
      }
    } catch (err) {
      showToast('Erro: ' + err.message, 'error');
    }
  });
}

async function deleteGasto(id) {
  if (!confirm('Remover este gasto?')) return;

  try {
    const res = await apiFetch(`${API_BASE}/gastos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('🗑️ Gasto removido.', 'success');
    await fetchGastos();
    renderAll();
  } catch {
    showToast('Erro ao remover gasto.', 'error');
  }
}

// ─── Seção crédito ───────────────────────────────────────────
function renderCreditSection() {
  const gastosCredito = state.gastos.filter(g => g.forma_pagamento === 'credito');
  const total = gastosCredito.reduce((s, g) => s + g.valor, 0);

  setText('credito-total', formatCurrency(total));
  setText('credito-count', `${gastosCredito.length} compra${gastosCredito.length !== 1 ? 's' : ''}`);

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  setText('credito-mes-label', `${meses[state.mesAtual - 1]}/${state.anoAtual}`);

  const container = document.getElementById('gastos-credito-lista');
  if (!container) return;

  if (gastosCredito.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💳</div>
        <p>Nenhuma compra no crédito este mês</p>
      </div>`;
    return;
  }

  container.innerHTML = gastosCredito.map(buildExpenseItem).join('');
}

// ─── Navegação ───────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.section));
  });

  // Fecha modal ao clicar fora
  document.getElementById('modal-reset')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
}

function navigate(sectionId) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === sectionId);
  });
  document.querySelectorAll('.section').forEach(sec => {
    sec.classList.toggle('active', sec.id === sectionId);
  });

  const titles = {
    dashboard:     'Dashboard',
    adicionar:     'Adicionar Gasto',
    lista:         'Meus Gastos',
    credito:       'Cartão de Crédito',
    alertas:       'Alertas & Sugestões',
    configuracoes: 'Configurações'
  };

  setText('page-title', titles[sectionId] || sectionId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Seletor de mês/ano ──────────────────────────────────────
function setupMonthSelector() {
  const mesEl = document.getElementById('select-mes');
  const anoEl = document.getElementById('select-ano');
  if (!mesEl || !anoEl) return;

  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  meses.forEach((m, i) => {
    const opt = new Option(m, i + 1);
    if (i + 1 === state.mesAtual) opt.selected = true;
    mesEl.appendChild(opt);
  });

  const anoAtual = state.anoAtual;
  for (let a = anoAtual; a >= anoAtual - 2; a--) {
    const opt = new Option(a, a);
    if (a === state.anoAtual) opt.selected = true;
    anoEl.appendChild(opt);
  }

  const refresh = async () => {
    state.mesAtual = parseInt(mesEl.value);
    state.anoAtual = parseInt(anoEl.value);
    await fetchGastos();
    renderAll();
  };

  mesEl.addEventListener('change', refresh);
  anoEl.addEventListener('change', refresh);
}

// ─── Configurações ───────────────────────────────────────────
function updateConfigForm() {
  const campos = ['saldo_inicial','limite_mensal','limite_alimentacao',
                  'limite_lazer','limite_transporte','limite_contas','limite_outros'];
  campos.forEach(c => {
    const el = document.getElementById(`config-${c}`);
    if (el) el.value = state.config[c] ?? '';
  });
}

function setupConfigForm() {
  const form = document.getElementById('form-config');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const campos = ['saldo_inicial','limite_mensal','limite_alimentacao',
                    'limite_lazer','limite_transporte','limite_contas','limite_outros'];
    const payload = {};
    campos.forEach(c => {
      payload[c] = parseFloat(document.getElementById(`config-${c}`)?.value || 0);
    });

    try {
      const res = await apiFetch(`${API_BASE}/gastos/config`, {
        method: 'PUT',
        body:   JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();
      state.config = { ...state.config, ...payload };
      showToast('✅ Configurações salvas!', 'success');
      renderAll();
    } catch {
      showToast('Erro ao salvar configurações.', 'error');
    }
  });
}

// ─── Filtro por categoria ────────────────────────────────────
function setFiltro(categoria) {
  state.filtroCategoria = categoria;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.categoria === categoria);
  });
  renderGastosList();
}

// ─── Utilitários ─────────────────────────────────────────────
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className   = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

document.addEventListener('DOMContentLoaded', init);
