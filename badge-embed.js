(function(){
  var scripts = document.querySelectorAll('script[src*="badge-embed.js"]');
  var script = scripts[scripts.length - 1];
  var id = script.getAttribute('data-id');
  var categoria = script.getAttribute('data-categoria');
  if(!id || !categoria) return;

  var el = document.createElement('a');
  el.href = 'https://www.podiorank.com.br';
  el.target = '_blank';
  el.rel = 'noopener';
  el.style.cssText = 'display:inline-flex;align-items:center;gap:6px;background:#1B1F3B;color:#E4CE84;padding:8px 14px;border-radius:999px;font-family:sans-serif;font-size:13px;font-weight:700;text-decoration:none;';
  el.innerHTML = '📖 <span id="podio-badge-text">carregando...</span>';
  script.parentNode.insertBefore(el, script);

  function atualizar(){
    fetch('https://www.podiorank.com.br/api/badge?categoria=' + encodeURIComponent(categoria) + '&id=' + encodeURIComponent(id))
      .then(function(r){ return r.json(); })
      .then(function(d){
        if(d.posicao){
          document.getElementById('podio-badge-text').innerText = '#' + d.posicao + ' no RankGospel';
        }
      }).catch(function(){});
  }
  atualizar();
  setInterval(atualizar, 300000);
})();

