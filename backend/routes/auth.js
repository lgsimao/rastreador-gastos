const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { query, insertMockData } = require('../database');
const { JWT_SECRET }            = require('../middleware/auth');

// ─── POST /api/auth/register ─────────────────────────────────
router.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });

  if (senha.length < 6)
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: 'Informe um e-mail válido.' });

  try {
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });

    const senhaHash = await bcrypt.hash(senha, 10);

    const result = await query(
      'INSERT INTO users (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome',
      [nome.trim(), email.toLowerCase().trim(), senhaHash]
    );

    const user = result.rows[0];

    // Config padrão para o novo usuário
    await query(
      'INSERT INTO configuracoes (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [user.id]
    );

    // Dados de exemplo
    await insertMockData(user.id);

    const token = jwt.sign({ id: user.id, nome: user.nome }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, nome: user.nome, email: email.toLowerCase().trim() });

  } catch (err) {
    console.error('Erro no register:', err.message);
    res.status(500).json({ error: 'Erro interno ao criar conta.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

  try {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const valid = await bcrypt.compare(senha, user.senha_hash);
    if (!valid)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    // Garante que config existe
    await query(
      'INSERT INTO configuracoes (user_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [user.id]
    );

    const token = jwt.sign({ id: user.id, nome: user.nome }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, nome: user.nome, email: user.email });

  } catch (err) {
    console.error('Erro no login:', err.message);
    res.status(500).json({ error: 'Erro interno ao fazer login.' });
  }
});

module.exports = router;
