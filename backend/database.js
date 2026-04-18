const { Pool } = require('pg');

// Pool de conexões PostgreSQL
// Railway injeta DATABASE_URL automaticamente; localmente vem do .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }   // Railway exige SSL
    : false
});

// Wrapper assíncrono para queries
async function query(text, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Cria tabelas se ainda não existirem
async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      nome       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      senha_hash TEXT    NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS gastos (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      valor            NUMERIC(12,2) NOT NULL,
      categoria        TEXT    NOT NULL,
      descricao        TEXT    DEFAULT '',
      forma_pagamento  TEXT    NOT NULL,
      data             DATE    NOT NULL,
      created_at       TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS configuracoes (
      user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      saldo_inicial       NUMERIC(12,2) DEFAULT 3000,
      limite_mensal       NUMERIC(12,2) DEFAULT 2000,
      limite_alimentacao  NUMERIC(12,2) DEFAULT 600,
      limite_lazer        NUMERIC(12,2) DEFAULT 400,
      limite_transporte   NUMERIC(12,2) DEFAULT 500,
      limite_contas       NUMERIC(12,2) DEFAULT 800,
      limite_outros       NUMERIC(12,2) DEFAULT 300
    )
  `);

  console.log('🗄️  Tabelas PostgreSQL verificadas/criadas com sucesso.');
}

// Insere dados de exemplo para novos usuários
async function insertMockData(userId) {
  const check = await query('SELECT COUNT(*) FROM gastos WHERE user_id = $1', [userId]);
  if (parseInt(check.rows[0].count) > 0) return; // já tem dados

  const now = new Date();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const ano = now.getFullYear();

  const mock = [
    { valor: 45.50,  cat: 'alimentacao', desc: 'Almoço restaurante',   forma: 'debito',   dia: '02' },
    { valor: 120.00, cat: 'transporte',  desc: 'Uber — semana 1',      forma: 'credito',  dia: '03' },
    { valor: 89.90,  cat: 'alimentacao', desc: 'Supermercado semanal', forma: 'debito',   dia: '05' },
    { valor: 250.00, cat: 'contas',      desc: 'Internet + streaming', forma: 'credito',  dia: '05' },
    { valor: 35.00,  cat: 'lazer',       desc: 'Cinema',               forma: 'credito',  dia: '07' },
    { valor: 65.00,  cat: 'alimentacao', desc: 'iFood delivery',       forma: 'credito',  dia: '09' },
    { valor: 180.00, cat: 'contas',      desc: 'Conta de luz',         forma: 'debito',   dia: '10' },
    { valor: 55.00,  cat: 'lazer',       desc: 'Bar com amigos',       forma: 'dinheiro', dia: '12' },
    { valor: 32.50,  cat: 'transporte',  desc: 'Gasolina',             forma: 'debito',   dia: '13' },
    { valor: 220.00, cat: 'alimentacao', desc: 'Feira semanal',        forma: 'dinheiro', dia: '15' },
    { valor: 78.00,  cat: 'outros',      desc: 'Farmácia',             forma: 'debito',   dia: '16' },
    { valor: 150.00, cat: 'lazer',       desc: 'Show de música',       forma: 'credito',  dia: '17' },
    { valor: 42.00,  cat: 'alimentacao', desc: 'Lanche no trabalho',   forma: 'dinheiro', dia: '18' },
    { valor: 95.00,  cat: 'transporte',  desc: 'Uber — semana 3',      forma: 'credito',  dia: '20' },
    { valor: 310.00, cat: 'contas',      desc: 'Plano de saúde',       forma: 'debito',   dia: '20' },
  ];

  for (const g of mock) {
    await query(
      `INSERT INTO gastos (user_id, valor, categoria, descricao, forma_pagamento, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, g.valor, g.cat, g.desc, g.forma, `${ano}-${mes}-${g.dia}`]
    );
  }

  console.log(`📦 Dados de exemplo inseridos para o usuário ${userId}`);
}

module.exports = { query, initDB, insertMockData };
