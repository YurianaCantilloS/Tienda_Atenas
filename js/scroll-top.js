/* ============================================================
   BOTÓN "VOLVER ARRIBA"
   Aparece muy sutilmente cuando el usuario baja en la página
   y, al tocarlo, lo devuelve al inicio con scroll suave.
   Lo usan la tienda (index.html) y el panel (admin.html).
   ============================================================ */
(function () {
  var btn = document.getElementById('btn-scroll-top');
  if (!btn) return;

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      btn.classList.toggle('visible', window.scrollY > 420);
      ticking = false;
    });
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
