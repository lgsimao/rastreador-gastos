const express = require('express');
const router  = express.Router();
const { query }          = require('../database');
const { authMiddleware } = require('../middleware/auth');

// Todas as rotas exigem JWT válido
router.use(authMiddleware);

// ─── GET /api/gastos/config ──────────────────────────────────
router.get('/config', async (req, res) => {
  try {
    let result = await query(
      'SELECT * FROM configuracoes WHERE user_id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      await query('INSERT INTO configuracoes (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.userId]);
      result = await query('SELECT * FROM configuracoes WHERE user_id = $1', [req.userId]);
    }

    // Converte NUMERIC para float (pg retorna string por padrão)
    const row = result.rows[0];
    const cfg = {};
    for (const [k, v] of Object.entries(row)) {
      cfg[k] = typeof v === 'string' && !isNaN(v) ? parseFloat(v) : v;
    }

    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/gastos/config ──────────────────────────────────
router.put('/config', async (req, res) => {
  const {
    saldo_inicial, limite_mensal,
    limite_alimentacao, limite_lazer,
    limite_transporte, limite_contas, limite_outros
  } = req.body;

  try {
    await query(`
      INSERT INTO configuracoes
        (user_id, saldo_inicial, limite_mensal, limite_alimentacao,
         limite_lazer, limite_transporte, limite_contas, limite_outros)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id) DO UPDATE SET
        saldo_inicial      = EXCLUDED.saldo_inicial,
        limite_mensal      = EXCLUDED.limite_mensal,
        limite_alimentacao = EXCLUDED.limite_alimentacao,
        limite_lazer       = EXCLUDED.limite_lazer,
        limite_transporte  = EXCLUDED.limite_transporte,
        limite_contas      = EXCLUDED.limite_contas,
        limite_outros      = EXCLUDED.limite_outros
    `, [req.userId, saldo_inicial, limite_mensal, limite_alimentacao,
        limite_lazer, limite_transporte, limite_contas, limite_outros]);

    res.json({ message: 'Configurações salvas com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gastos/all ──────────────────────────────────
router.delete('/all', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM gastos WHERE user_id = $1',
      [req.userId]
    );
    res.json({ message: `${result.rowCount} gastos removidos.`, removidos: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gastos/stats/mes ───────────────────────────────
router.get('/stats/mes', async (req, res) => {
  const now = new Date();
  try {
    const result = await query(`
      SELECT
        categoria,
        SUM(valor)::float  AS total,
        COUNT(*)::int      AS quantidade
      FROM gastos
      WHERE user_id = $1
        AND EXTRACT(MONTH FROM data) = $2
        AND EXTRACT(YEAR  FROM data) = $3
      GROUP BY categoria
      ORDER BY total DESC
    `, [req.userId, now.getMonth() + 1, now.getFullYear()]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/gastos ─────────────────────────────────────────
router.get('/', async (req, res) => {
  const { mes, ano } = req.query;

  try {
    let sql    = `SELECT id, user_id, valor::float, categoria, descricao,
                         forma_pagamento, TO_CHAR(data, 'YYYY-MM-DD') AS data, created_at
                  FROM gastos WHERE user_id = $1`;
    const params = [req.userId];

    if (mes && ano) {
      sql += ` AND EXTRACT(MONTH FROM data) = $2 AND EXTRACT(YEAR FROM data) = $3`;
      params.push(parseInt(mes), parseInt(ano));
    }

    sql += ' ORDER BY data DESC, created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/gastos ────────────────────────────────────────
router.post('/', async (req, res) => {
  const { valor, categoria, descricao, forma_pagamento, data } = req.body;

  if (!valor || !categoria || !forma_pagamento || !data)
    return res.status(400).json({ error: 'Campos obrigatórios: valor, categoria, forma_pagamento, data' });

  if (valor <= 0)
    return res.status(400).json({ error: 'O valor deve ser maior que zero.' });

  try {
    const result = await query(
      `INSERT INTO gastos (user_id, valor, categoria, descricao, forma_pagamento, data)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.userId, valor, categoria, descricao || '', forma_pagamento, data]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Gasto adicionado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/gastos/:id ──────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM gastos WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: 'Gasto não encontrado.' });

    res.json({ message: 'Gasto removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
