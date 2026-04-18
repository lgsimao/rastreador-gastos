/* ═══════════════════════════════════════════════════════════
   DASHBOARD.JS — Gráficos com Chart.js
   ═══════════════════════════════════════════════════════════ */

// Instâncias dos gráficos (para destruir antes de recriar)
let chartCategoria = null;
let chartTendencia = null;

const CHART_COLORS = {
  alimentacao: '#f59e0b',
  transporte:  '#3b82f6',
  lazer:       '#8b5cf6',
  contas:      '#ef4444',
  outros:      '#6b7280'
};

// ─── GRÁFICO DE ROSCA (categorias) ──────────────────────────
function renderCategoryChart() {
  const canvas = document.getElementById('chart-categorias');
  if (!canvas) return;

  // Totaliza por categoria
  const porCat = {};
  state.gastos.forEach(g => {
    porCat[g.categoria] = (porCat[g.categoria] || 0) + g.valor;
  });

  renderCategoryList(porCat);

  if (chartCategoria) { chartCategoria.destroy(); chartCategoria = null; }

  const keys   = Object.keys(porCat);
  const values = Object.values(porCat);

  if (values.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const labels = keys.map(k => CATEGORIAS[k]?.label || k);
  const colors = keys.map(k => CHART_COLORS[k] || '#94a3b8');

  chartCategoria = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((ctx.parsed / total) * 100).toFixed(1);
              return `  ${formatCurrency(ctx.parsed)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// Lista de categorias com valores abaixo do gráfico
function renderCategoryList(porCat) {
  const container = document.getElementById('category-list');
  if (!container) return;

  const total = Object.values(porCat).reduce((a, b) => a + b, 0);

  if (total === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:8px 0">Nenhum gasto registrado neste mês.</p>';
    return;
  }

  container.innerHTML = Object.entries(porCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, valor]) => {
      const pct  = ((valor / total) * 100).toFixed(0);
      const info = CATEGORIAS[cat] || { label: cat, color: '#6b7280', icon: '📦' };
      return `
        <div class="category-item">
          <span class="category-name">
            <span class="category-dot" style="background:${info.color}"></span>
            ${info.icon} ${info.label}
          </span>
          <span style="font-weight:700;font-size:13px">
            ${formatCurrency(valor)}
            <span style="color:var(--text-muted);font-weight:400">&nbsp;${pct}%</span>
          </span>
        </div>`;
    }).join('');
}

// ─── GRÁFICO DE BARRAS (gastos por dia) ─────────────────────
function renderTrendChart() {
  const canvas = document.getElementById('chart-tendencia');
  if (!canvas) return;

  if (chartTendencia) { chartTendencia.destroy(); chartTendencia = null; }

  // Agrupa por dia do mês
  const porDia = {};
  state.gastos.forEach(g => {
    const dia = g.data.split('-')[2];          // "05", "12", etc.
    porDia[dia] = (porDia[dia] || 0) + g.valor;
  });

  const dias   = Object.keys(porDia).sort();
  const valores = dias.map(d => porDia[d]);

  // Acumulado ao longo dos dias
  let soma = 0;
  const acumulado = valores.map(v => { soma += v; return soma; });

  if (dias.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  chartTendencia = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dias.map(d => `${parseInt(d)}`),
      datasets: [
        {
          label: 'Gasto do dia',
          data: valores,
          backgroundColor: 'rgba(99,102,241,0.55)',
          borderColor: '#6366f1',
          borderWidth: 1,
          borderRadius: 5,
          order: 2
        },
        {
          label: 'Acumulado',
          data: acumulado,
          type: 'line',
          borderColor: '#f59e0b',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
          fill: false,
          tension: 0.4,
          yAxisID: 'y2',
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { size: 11 }, boxWidth: 12 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `  ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        },
        y: {
          ticks: {
            font: { size: 11 },
            callback: (v) => `R$${v}`
          },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        y2: {
          position: 'right',
          grid: { display: false },
          ticks: {
            font: { size: 11 },
            callback: (v) => `R$${v}`
          }
        }
      }
    }
  });
}
