/* ═══════════════════════════════════════════════════════════
   ALERTAS.JS — Geração e Renderização de Alertas Automáticos
   ═══════════════════════════════════════════════════════════ */

function renderAlertasSection() {
  const container = document.getElementById('alertas-container');
  if (!container) return;

  const alertas = gerarAlertas();

  if (alertas.length === 0) {
    container.innerHTML = `
      <div class="alert-card success">
        <span class="alert-icon">✅</span>
        <div class="alert-content">
          <h4>Tudo sob controle!</h4>
          <p>Seus gastos estão dentro dos limites configurados. Parabéns pelo controle financeiro!</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = alertas.map(a => `
    <div class="alert-card ${a.tipo}">
      <span class="alert-icon">${a.icone}</span>
      <div class="alert-content">
        <h4>${a.titulo}</h4>
        <p>${a.mensagem}</p>
      </div>
    </div>
  `).join('');
}

function gerarAlertas() {
  const alertas = [];
  const cfg     = state.config;
  const gastos  = state.gastos;

  const totalMes     = gastos.reduce((s, g) => s + g.valor, 0);
  const saldoRestante = (cfg.saldo_inicial || 0) - totalMes;

  // ── Limite mensal ──────────────────────────────────────────
  if (totalMes > cfg.limite_mensal) {
    const excesso = totalMes - cfg.limite_mensal;
    alertas.push({
      tipo:     'danger',
      icone:    '🚨',
      titulo:   'Limite mensal ultrapassado!',
      mensagem: `Você gastou ${formatCurrency(totalMes)}, ultrapassando em ${formatCurrency(excesso)} o limite de ${formatCurrency(cfg.limite_mensal)}.`
    });
  } else if (totalMes > cfg.limite_mensal * 0.8) {
    const restante = cfg.limite_mensal - totalMes;
    alertas.push({
      tipo:     'warning',
      icone:    '⚠️',
      titulo:   'Perto do limite mensal',
      mensagem: `Você já utilizou ${((totalMes / cfg.limite_mensal) * 100).toFixed(0)}% do limite mensal. Restam apenas ${formatCurrency(restante)}.`
    });
  }

  // ── Saldo ──────────────────────────────────────────────────
  if (saldoRestante < 0) {
    alertas.push({
      tipo:     'danger',
      icone:    '💸',
      titulo:   'Saldo negativo!',
      mensagem: `Seus gastos ultrapassaram o saldo inicial em ${formatCurrency(Math.abs(saldoRestante))}. Revise seus gastos urgentemente.`
    });
  } else if (saldoRestante < (cfg.saldo_inicial || 1) * 0.1) {
    alertas.push({
      tipo:     'warning',
      icone:    '💰',
      titulo:   'Saldo muito baixo',
      mensagem: `Restam apenas ${formatCurrency(saldoRestante)} do saldo inicial de ${formatCurrency(cfg.saldo_inicial)}. Use com cuidado!`
    });
  } else if (saldoRestante < (cfg.saldo_inicial || 1) * 0.2) {
    alertas.push({
      tipo:     'warning',
      icone:    '🏦',
      titulo:   'Saldo ficando baixo',
      mensagem: `Você ainda tem ${formatCurrency(saldoRestante)}, mas está próximo dos 20% do saldo inicial.`
    });
  }

  // ── Por categoria ──────────────────────────────────────────
  const limitesCat = {
    alimentacao: cfg.limite_alimentacao,
    lazer:       cfg.limite_lazer,
    transporte:  cfg.limite_transporte,
    contas:      cfg.limite_contas,
    outros:      cfg.limite_outros
  };

  const porCat = {};
  gastos.forEach(g => { porCat[g.categoria] = (porCat[g.categoria] || 0) + g.valor; });

  Object.entries(porCat).forEach(([cat, valor]) => {
    const limite = limitesCat[cat];
    if (!limite || limite <= 0) return;

    const info = CATEGORIAS[cat] || { label: cat, icon: '📦' };
    const pct  = (valor / limite) * 100;

    if (valor > limite) {
      alertas.push({
        tipo:     'danger',
        icone:    info.icon,
        titulo:   `Limite de ${info.label} ultrapassado`,
        mensagem: `Gasto de ${formatCurrency(valor)} em ${info.label} superou o limite de ${formatCurrency(limite)} em ${formatCurrency(valor - limite)}.`
      });
    } else if (pct > 80) {
      alertas.push({
        tipo:     'warning',
        icone:    info.icon,
        titulo:   `${info.label} quase no limite`,
        mensagem: `${pct.toFixed(0)}% do limite de ${info.label} utilizado (${formatCurrency(valor)} de ${formatCurrency(limite)}).`
      });
    }
  });

  // ── Muitas compras no crédito ──────────────────────────────
  const totalCredito = gastos.filter(g => g.forma_pagamento === 'credito').reduce((s, g) => s + g.valor, 0);
  if (totalMes > 0 && (totalCredito / totalMes) > 0.7) {
    alertas.push({
      tipo:     'warning',
      icone:    '💳',
      titulo:   'Alto uso do crédito',
      mensagem: `${((totalCredito / totalMes) * 100).toFixed(0)}% dos gastos são no crédito. Fique atento à fatura!`
    });
  }

  return alertas;
}
