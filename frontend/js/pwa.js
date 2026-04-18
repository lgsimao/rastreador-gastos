/* ═══════════════════════════════════════════════════════════
   PWA.JS — Service Worker + Botão de Instalação
   ═══════════════════════════════════════════════════════════ */

// Registra o Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('✅ Service Worker registrado'))
      .catch(err => console.log('SW erro:', err));
  });
}

// Banner de instalação "Adicionar à tela inicial"
let installPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  showInstallBanner();
});

function showInstallBanner() {
  // Não mostra se já foi dispensado antes
  if (localStorage.getItem('pwa_dismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.innerHTML = `
    <div class="install-banner-content">
      <span class="install-icon">💰</span>
      <div class="install-text">
        <strong>Instalar como app</strong>
        <span>Acesse direto da tela inicial</span>
      </div>
      <button class="install-btn-yes" onclick="installApp()">Instalar</button>
      <button class="install-btn-no" onclick="dismissBanner()">✕</button>
    </div>
  `;

  // Estilo inline para não depender do CSS carregado
  banner.style.cssText = `
    position: fixed;
    bottom: 76px;
    left: 12px;
    right: 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    z-index: 9998;
    padding: 14px 16px;
    animation: slideUpBanner 0.4s ease;
  `;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUpBanner {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: none; opacity: 1; }
    }
    .install-banner-content {
      display: flex; align-items: center; gap: 10px;
    }
    .install-icon { font-size: 28px; flex-shrink: 0; }
    .install-text {
      flex: 1; display: flex; flex-direction: column; gap: 2px;
    }
    .install-text strong { font-size: 14px; color: #1e293b; }
    .install-text span   { font-size: 12px; color: #64748b; }
    .install-btn-yes {
      background: #6366f1; color: #fff;
      border: none; border-radius: 8px;
      padding: 8px 14px; font-size: 13px;
      font-weight: 700; cursor: pointer;
      white-space: nowrap; font-family: inherit;
    }
    .install-btn-no {
      background: none; border: none;
      color: #94a3b8; font-size: 16px;
      cursor: pointer; padding: 4px; flex-shrink: 0;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(banner);
}

async function installApp() {
  if (!installPrompt) return;

  const result = await installPrompt.prompt();
  if (result.outcome === 'accepted') {
    dismissBanner();
    console.log('✅ App instalado!');
  }
  installPrompt = null;
}

function dismissBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.remove();
  localStorage.setItem('pwa_dismissed', '1');
}

// Detecta se já está instalado (standalone)
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('✅ Rodando como app instalado');
}
