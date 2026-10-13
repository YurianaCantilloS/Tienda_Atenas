/* ============================================================
   UTILIDADES GENERALES
   ============================================================ */

function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

const TOAST_TIPOS = { check: 'check', ok: 'check', exito: 'check', cart: 'cart', warn: 'warn', error: 'error', sparkle: 'sparkle' };

/* Iconos sólidos (rellenos) para las notificaciones, se ven más definidos */
const TOAST_ICONS = {
  check:   '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.22 14.03-3.6-3.6 1.42-1.42 2.18 2.18 5.18-5.18 1.42 1.42-6.6 6.6Z"/></svg>',
  warn:    '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM11 9a1 1 0 1 1 2 0v4a1 1 0 1 1-2 0V9Zm1 8.6a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z"/></svg>',
  error:   '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.54 12.12-1.42 1.42L12 13.42l-2.12 2.12-1.42-1.42L10.58 12 8.46 9.88l1.42-1.42L12 10.58l2.12-2.12 1.42 1.42L13.42 12l2.12 2.12Z"/></svg>',
  sparkle: '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9.94 15.5a2 2 0 0 0-1.44-1.44l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94a2 2 0 0 0 1.44-1.44l1.58-6.13a.5.5 0 0 1 .96 0l1.58 6.13a2 2 0 0 0 1.44 1.44l6.13 1.58a.5.5 0 0 1 0 .96l-6.13 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0l-1.58-6.13Z"/></svg>',
  cart:    '<svg class="icon-svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 2 3 6.5V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5L17.5 2h-11Zm-.6 2h12.2l1.8 2H4.1l1.8-2ZM12 9a4.5 4.5 0 0 1 4.5 4.5h-2A2.5 2.5 0 0 0 12 11a2.5 2.5 0 0 0-2.5 2.5h-2A4.5 4.5 0 0 1 12 9Z"/></svg>'
};

function showToast(msg, tipo = 'check', duracion) {
  const t = document.getElementById('toast');
  if (!t) return;
  const tipoFinal = TOAST_TIPOS[tipo] || 'check';
  const icono = TOAST_ICONS[tipo] || TOAST_ICONS[tipoFinal] || TOAST_ICONS.check;

  t.classList.remove('show', 't-check', 't-warn', 't-error', 't-sparkle', 't-cart');
  void t.offsetWidth; // fuerza reflow para reiniciar animación
  t.innerHTML = `<span class="toast-ico">${icono}</span><span class="toast-msg">${msg}</span>`;
  t.classList.add('show', 't-' + tipoFinal);

  clearTimeout(window._toastTimeout);
  const ms = duracion || (tipoFinal === 'warn' || tipoFinal === 'error' ? 3400 : 2200);
  window._toastTimeout = setTimeout(() => t.classList.remove('show'), ms);
}
