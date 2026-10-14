/* ============================================================
   SONIDOS: efectos cortos y suaves con Web Audio (sin archivos)
   Se crean de forma perezosa tras el primer toque del usuario,
   que es cuando el navegador permite reproducir audio.
   ============================================================ */

let _audioCtx = null;

function _ctx() {
  if (!_audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _audioCtx = new Ctx();
  }
  if (_audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}

/* Un tono corto con envolvente para que suene limpio y no brusco. */
function _tono(frec, inicio, dur, tipo, vol) {
  const ac = _ctx();
  if (!ac) return;
  const t0 = ac.currentTime + inicio;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = tipo || 'sine';
  osc.frequency.setValueAtTime(frec, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.06, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/* "plup": se agregó algo al carrito */
function sonidoAgregar() {
  _tono(640, 0, 0.10, 'sine', 0.06);
  _tono(980, 0.055, 0.12, 'sine', 0.05);
}

/* Producto no disponible / sin stock */
function sonidoNoDisponible() {
  _tono(240, 0, 0.13, 'sawtooth', 0.035);
  _tono(170, 0.10, 0.16, 'sawtooth', 0.04);
}

/* Quitar un producto del carrito */
function sonidoQuitar() {
  _tono(430, 0, 0.10, 'sine', 0.045);
}

/* Caja registradora: al enviar el pedido por WhatsApp */
function sonidoCaja() {
  _tono(988, 0, 0.09, 'square', 0.045);
  _tono(1319, 0.08, 0.18, 'square', 0.05);
  _tono(1760, 0.08, 0.30, 'sine', 0.045);
}
