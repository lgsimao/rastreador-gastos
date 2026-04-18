const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'rastreador_gastos_secret_2024_@seguro';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido. Faça login.' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded  = jwt.verify(token, JWT_SECRET);
    req.userId     = decoded.id;
    req.userName   = decoded.nome;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}

module.exports = { authMiddleware, JWT_SECRET };
