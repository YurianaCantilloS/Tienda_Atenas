/* ============================================================
   APARIENCIA DE LA PÁGINA
   Lee el banner y los avisos que edita el admin en
   "Ajustes → Apariencia". Si algo falla, la tienda
   sigue mostrando el banner que ya tenía.
   ============================================================ */

const APARIENCIA_DEF = {
  banner_url: '',
  banner_activo: true,
  aviso_texto: '',
  aviso_activo: true,
  aviso_color: 'lila',
  pie_frase: 'Elegancia que se siente, estilo que se vive.',
  pie_instagram: '@atenas.style_ctg',
  orden_tienda: 'destacados'
};

const COLOR_AVISO = {
  lila:     { fondo: '#F6EEFB', texto: '#3A2A45' },
  rosa:     { fondo: '#FFF0F6', texto: '#3A2A45' },
  verde:    { fondo: '#E8F7EE', texto: '#14532D' },
  amarillo: { fondo: '#FFF7E0', texto: '#7A5B00' }
};
function colorDe(c){ return COLOR_AVISO[c] || COLOR_AVISO.lila; }

function aplicarApariencia(a){
  a={...APARIENCIA_DEF,...(a||{})};
  const c=colorDe(a.aviso_color);
  const box=document.getElementById('aviso-tienda');
  if(box){
    const t=String(a.aviso_texto||'').trim();
    if(!t||a.aviso_activo===false){ box.style.display='none'; box.innerHTML=''; }
    else { box.innerHTML=t.replace(/\n/g,'<br>'); box.style.display='block'; }
  }
  const hero=document.getElementById('hero');
  const img=document.getElementById('hero-banner');
  if(hero&&img){
    if(!a.banner_url||a.banner_activo===false){
      hero.style.display='none'; img.removeAttribute('src'); img.style.display='none';
    }else{
      hero.style.display=''; img.src=a.banner_url; img.style.display='';
      img.onerror=function(){hero.style.display='none';};
    }
  }
  const set=(id,txt)=>{const el=document.getElementById(id); if(el) el.textContent=txt||'';};
  set('pie-nombre',a.negocio_nombre||a.pie_nombre);
  set('pie-ciudad',a.negocio_ciudad||a.pie_ciudad);
  set('pie-frase',a.pie_frase);
  set('pie-telefono',a.negocio_telefono||a.pie_telefono);
  set('pie-instagram',a.negocio_instagram||a.pie_instagram);

  /* Orden de los productos elegido en el panel */
  if(typeof setOrdenTienda==='function') setOrdenTienda(a.orden_tienda||'destacados');
}
async function initApariencia(){
  try{
    if(typeof sb!=='undefined' && sb.from){
      const {data}=await sb.from('configuracion').select('*').eq('id',1).maybeSingle();
      if(data) aplicarApariencia(data);
    }
  }catch(e){}
}
