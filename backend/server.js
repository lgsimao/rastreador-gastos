require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB }   = require('./database');
const gastosRoutes = require('./routes/gastos');
const authRoutes   = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas por JWT
app.use('/api/gastos', gastosRoutes);

// Fallback → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log('\n✅ Rastreador de Gastos rodando!');
      console.log(`🌐 Acesse: http://localhost:${PORT}`);
      console.log(`🗄️  Banco: ${process.env.DATABASE_URL ? 'PostgreSQL ✓' : '⚠️  DATABASE_URL não definida!'}`);
      console.log(`🔐 JWT: ${process.env.JWT_SECRET ? 'configurado ✓' : '⚠️  JWT_SECRET não definida!'}\n`);
    });
  })
  .catch(err => {
    console.error('❌ Erro ao inicializar banco de dados:', err.message);
    process.exit(1);
  });
