/* ═══════════════════════════════════════════════════════════
   SUGESTOES.JS — IA Simples de Sugestões de Economia
   ═══════════════════════════════════════════════════════════ */

function renderSugestoesSection() {
  const container = document.getElementById('sugestoes-container');
  if (!container) return;

  const sugestoes = gerarSugestoes();

  if (sugestoes.length === 0) {
    container.innerHTML = `
      <div class="suggestion-card">
        <span class="suggestion-icon">🎉</span>
        <div class="suggestion-content">
          <h4>Ótimo trabalho!</h4>
          <p>Seus gastos estão equilibrados. Continue mantendo esse ritmo de controle financeiro!</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = sugestoes.map(s => `
    <div class="suggestion-card">
      <span class="suggestion-icon">${s.icone}</span>
      <div class="suggestion-content">
        <h4>${s.titulo}</h4>
        <p>${s.texto}</p>
      </div>
    </div>
  `).join('');
}

function gerarSugestoes() {
  const sugestoes = [];
  const cfg    = state.config;
  const gastos = state.gastos;

  if (gastos.length === 0) return sugestoes;

  const totalMes = gastos.reduce((s, g) => s + g.valor, 0);

  // Totais por categoria
  const porCat = {};
  gastos.forEach(g => { porCat[g.categoria] = (porCat[g.categoria] || 0) + g.valor; });

  // Contagem de transações por categoria
  const contCat = {};
  gastos.forEach(g => { contCat[g.categoria] = (contCat[g.categoria] || 0) + 1; });

  const alimentacao = porCat['alimentacao'] || 0;
  const lazer       = porCat['lazer']       || 0;
  const transporte  = porCat['transporte']  || 0;

  // ── 1. Alimentação elevada ────────────────────────────────
  if (alimentacao > (cfg.limite_alimentacao || 600) * 0.65) {
    const ticket = alimentacao / (contCat['alimentacao'] || 1);
    sugestoes.push({
      icone:  '🍽️',
      titulo: 'Gastos com alimentação acima do esperado',
      texto:  `Você gastou ${formatCurrency(alimentacao)} em alimentação (ticket médio de ${formatCurrency(ticket)}). Cozinhar em casa pode reduzir esse valor em até 40%.`
    });
  }

  // ── 2. Muitos deliveries (ticket alto + varias transacoes) ─
  if (contCat['alimentacao'] >= 8 && alimentacao > 200) {
    sugestoes.push({
      icone:  '📦',
      titulo: 'Muitas compras de alimentação',
      texto:  `${contCat['alimentacao']} transações em alimentação este mês. Planejar compras semanais e levar marmita pode gerar uma economia significativa.`
    });
  }

  // ── 3. Lazer elevado ──────────────────────────────────────
  if (lazer > (cfg.limite_lazer || 400) * 0.65) {
    sugestoes.push({
      icone:  '🎮',
      titulo: 'Considere reduzir gastos com lazer',
      texto:  `${formatCurrency(lazer)} foram gastos em lazer. Buscar opções gratuitas ou de baixo custo (parques, streaming compartilhado, eventos gratuitos) pode ajudar a economizar.`
    });
  }

  // ── 4. Transporte elevado ─────────────────────────────────
  if (transporte > (cfg.limite_transporte || 500) * 0.65) {
    sugestoes.push({
      icone:  '🚗',
      titulo: 'Gastos com transporte elevados',
      texto:  `${formatCurrency(transporte)} em transporte. Considere transporte público, caronas compartilhadas ou ciclovias para reduzir esse custo.`
    });
  }

  // ── 5. Uso excessivo de crédito ───────────────────────────
  const totalCredito = gastos.filter(g => g.forma_pagamento === 'credito').reduce((s, g) => s + g.valor, 0);
  const pctCredito   = totalMes > 0 ? (totalCredito / totalMes) * 100 : 0;
  if (pctCredito > 55) {
    sugestoes.push({
      icone:  '💳',
      titulo: 'Prefira débito ou dinheiro',
      texto:  `${pctCredito.toFixed(0)}% dos seus gastos são no crédito (${formatCurrency(totalCredito)}). Pagar no débito ou dinheiro ajuda a evitar gastos invisíveis que só aparecem na fatura.`
    });
  }

  // ── 6. Gasto concentrado em uma categoria ────────────────
  const topEntry = Object.entries(porCat).sort((a, b) => b[1] - a[1])[0];
  if (topEntry && totalMes > 150) {
    const [topCat, topVal] = topEntry;
    const pctTop = (topVal / totalMes) * 100;
    const info   = CATEGORIAS[topCat] || { label: topCat };
    if (pctTop > 55) {
      sugestoes.push({
        icone:  '📊',
        titulo: `Gastos concentrados em ${info.label}`,
        texto:  `${pctTop.toFixed(0)}% de todos os gastos do mês estão em ${info.label}. Analisar esta categoria com mais detalhe pode revelar onde economizar.`
      });
    }
  }

  // ── 7. Oportunidade de poupar ─────────────────────────────
  const limMensal = cfg.limite_mensal || 2000;
  if (totalMes < limMensal * 0.5 && totalMes > 0) {
    const potencial = limMensal - totalMes;
    sugestoes.push({
      icone:  '🏦',
      titulo: 'Ótima oportunidade para poupar!',
      texto:  `Você gastou apenas ${((totalMes / limMensal) * 100).toFixed(0)}% do limite mensal. Considere investir os ${formatCurrency(potencial)} restantes em uma reserva de emergência ou investimento.`
    });
  }

  // ── 8. Pagamentos recorrentes revisáveis ─────────────────
  const contas = porCat['contas'] || 0;
  if (contas > 400) {
    sugestoes.push({
      icone:  '📄',
      titulo: 'Revise suas assinaturas e contas fixas',
      texto:  `${formatCurrency(contas)} em contas este mês. Vale revisar assinaturas de streaming, planos de celular e internet — cancelar o que não usa mais pode economizar bastante.`
    });
  }

  return sugestoes.slice(0, 5);
}
