(function(){

  // ---------- state ----------
  var config = {
    nombre:"KAEL IMPORTACIONES SOCIEDAD ANONIMA CERRADA",
    ruc:"20608273621",
    direccion:"JR. COTABAMBAS NRO. 211 DPTO. 240 CERCADO LIMA LIMA - LIMA - LIMA",
    telefono:"992155022",
    atendido:"Ventas 6 MONICA",
    serie:"BB06",
    correlativo:5,
    qrTexto:"20608273621",
    resolucion:"0180050000781/SUNAT"
  };
  var catalogo = [];
  var historial = [];
  var items = [];
  var itemUid = 0;

  function newItem(desc, precio){
    itemUid++;
    return {id:itemUid, desc: desc||"", cant:1, precio: (precio!==undefined?precio:0)};
  }

  // ---------- storage helpers ----------
  async function getStored(key){
    try{
      if(window.storage && window.storage.get){
        var stored = await window.storage.get(key);
        return stored && stored.value ? stored.value : null;
      }
    }catch(e){}
    try{ return window.localStorage.getItem('boleta_' + key); }catch(e){ return null; }
  }

  async function setStored(key, value){
    try{
      if(window.storage && window.storage.set){
        await window.storage.set(key, value);
        return;
      }
    }catch(e){}
    try{ window.localStorage.setItem('boleta_' + key, value); }catch(e){}
  }

  async function loadAll(){
    try{
      var configValue = await getStored('config');
      if(configValue) config = Object.assign(config, JSON.parse(configValue));
    }catch(e){}
    try{
      var catalogoValue = await getStored('catalogo');
      if(catalogoValue) catalogo = JSON.parse(catalogoValue);
    }catch(e){}
    try{
      var historialValue = await getStored('historial');
      if(historialValue) historial = JSON.parse(historialValue);
    }catch(e){}

    var ultimoNumero = historial.reduce(function(max, boleta){
      var partes = String(boleta.numero || '').split('-');
      var numero = Number(partes[partes.length - 1]);
      return partes.length > 1 && partes[0] === config.serie && Number.isFinite(numero)
        ? Math.max(max, numero) : max;
    }, 0);
    config.correlativo = Math.max(Number(config.correlativo) || 1, ultimoNumero + 1);
  }

  async function saveConfig(){
    await setStored('config', JSON.stringify(config));
  }
  async function saveCatalogo(){
    await setStored('catalogo', JSON.stringify(catalogo));
  }
  async function saveHistorial(){
    await setStored('historial', JSON.stringify(historial));
  }

  // ---------- number to words (soles) ----------
  var UNIDADES = ['', 'UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ',
    'ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE','VEINTE'];
  var DECENAS = ['','','VEINTI','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  var CENTENAS = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

  function tresDigitos(n){
    if(n===0) return '';
    if(n===100) return 'CIEN';
    var c=Math.floor(n/100), r=n%100, out='';
    if(c>0) out += CENTENAS[c] + ' ';
    if(r>0){
      if(r<=20){ out += UNIDADES[r]; }
      else{
        var d=Math.floor(r/10), u=r%10;
        if(d===2){ out += 'VEINTI' + (u>0? UNIDADES[u].toLowerCase()==='' ? '' : UNIDADES[u] : ''); }
        else{
          out += DECENAS[d];
          if(u>0) out += ' Y ' + UNIDADES[u];
        }
      }
    }
    return out.trim();
  }

  function enteroALetras(n){
    if(n===0) return 'CERO';
    if(n>=1000000){
      var millones = Math.floor(n/1000000);
      var resto = n%1000000;
      var pre = millones===1 ? 'UN MILLON' : tresDigitos(millones) + ' MILLONES';
      return (pre + ' ' + (resto>0? enteroALetras(resto): '')).trim();
    }
    if(n>=1000){
      var miles = Math.floor(n/1000);
      var resto2 = n%1000;
      var pre2 = miles===1 ? 'MIL' : tresDigitos(miles) + ' MIL';
      return (pre2 + ' ' + (resto2>0? tresDigitos(resto2): '')).trim();
    }
    return tresDigitos(n);
  }

  function montoALetras(total){
    var entero = Math.floor(total+0.0001);
    var centavos = Math.round((total-entero)*100);
    var cent = String(centavos).padStart(2,'0');
    return 'SON: ' + enteroALetras(entero) + ' Y ' + cent + '/100 SOLES';
  }

  // ---------- rendering: form ----------
  function fillConfigForm(){
    document.getElementById('cfgNombre').value = config.nombre;
    document.getElementById('cfgRuc').value = config.ruc;
    document.getElementById('cfgDireccion').value = config.direccion;
    document.getElementById('cfgTelefono').value = config.telefono;
    document.getElementById('cfgAtendido').value = config.atendido;
    document.getElementById('cfgSerie').value = config.serie;
    document.getElementById('cfgCorrelativo').value = config.correlativo;
    document.getElementById('cfgQrTexto').value = config.qrTexto || '20608273621';
    document.getElementById('cfgResolucion').value = config.resolucion || '0180050000781/SUNAT';
  }

  function renderCatalogo(){
    var box = document.getElementById('catalogoChips');
    box.innerHTML = '';
    catalogo.forEach(function(p, idx){
      var chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = p.nombre + ' · S/ ' + Number(p.precio).toFixed(2);
      chip.title = 'Clic para agregar como ítem';
      chip.addEventListener('click', function(){
        items.push(newItem(p.nombre, p.precio));
        renderItems();
        renderTicket();
      });
      box.appendChild(chip);
    });
  }

  function renderItems(){
    var body = document.getElementById('itemsBody');
    body.innerHTML = '';
    items.forEach(function(it){
      var tr = document.createElement('tr');

      var tdDesc = document.createElement('td');
      var inpDesc = document.createElement('input');
      inpDesc.type = 'text';
      inpDesc.value = it.desc;
      inpDesc.placeholder = 'Producto';
      inpDesc.addEventListener('input', function(){ it.desc = inpDesc.value; renderTicket(); });
      tdDesc.appendChild(inpDesc);

      var tdCant = document.createElement('td');
      tdCant.className='num';
      var inpCant = document.createElement('input');
      inpCant.type = 'number'; inpCant.min='1'; inpCant.value = it.cant;
      inpCant.addEventListener('input', function(){ it.cant = Number(inpCant.value)||0; renderRowTotal(tr, it); renderTicket(); });
      tdCant.appendChild(inpCant);

      var tdPrecio = document.createElement('td');
      tdPrecio.className='num';
      var inpPrecio = document.createElement('input');
      inpPrecio.type='number'; inpPrecio.step='0.10'; inpPrecio.min='0'; inpPrecio.value = it.precio;
      inpPrecio.addEventListener('input', function(){ it.precio = Number(inpPrecio.value)||0; renderRowTotal(tr, it); renderTicket(); });
      tdPrecio.appendChild(inpPrecio);

      var tdTotal = document.createElement('td');
      tdTotal.className = 'row-total';
      tdTotal.textContent = 'S/ ' + (it.cant*it.precio).toFixed(2);

      var tdDel = document.createElement('td');
      var btnDel = document.createElement('button');
      btnDel.className = 'btn-del';
      btnDel.textContent = '×';
      btnDel.title = 'Eliminar ítem';
      btnDel.addEventListener('click', function(){
        items = items.filter(function(x){ return x.id !== it.id; });
        renderItems();
        renderTicket();
      });
      tdDel.appendChild(btnDel);

      tr.appendChild(tdDesc);
      tr.appendChild(tdCant);
      tr.appendChild(tdPrecio);
      tr.appendChild(tdTotal);
      tr.appendChild(tdDel);
      body.appendChild(tr);
    });
  }

  function renderRowTotal(tr, it){
    tr.querySelector('.row-total').textContent = 'S/ ' + (it.cant*it.precio).toFixed(2);
  }

  // ---------- totals ----------
  function computeTotals(){
    var total = items.reduce(function(s,it){ return s + (it.cant*it.precio); }, 0);
    var opGravada = total / 1.18;
    var igv = total - opGravada;
    return {total:total, opGravada:opGravada, igv:igv};
  }

  // ---------- ticket preview ----------
  function currentNumero(){
    return config.serie + '-' + String(config.correlativo).padStart(8,'0');
  }

  function fechaHoraActual(){
    var d = new Date();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes());
  }

  function renderTicket(numeroOverride, fechaOverride){
    var t = computeTotals();
    var cliente = document.getElementById('cliNombre').value || 'Cliente genérico';
    var tipoDoc = document.getElementById('cliTipoDoc').value;
    var numDoc = document.getElementById('cliNumDoc').value || '00000000';
    var direccion = document.getElementById('cliDireccion').value;
    var pago = document.getElementById('formaPago').value;
    var numero = numeroOverride || currentNumero();
    var fecha = fechaOverride || fechaHoraActual();

    var rowsHtml = items.map(function(it){
      return '<tr><td>'+(it.cant)+'</td><td>'+escapeHtml(it.desc||'—')+'</td>'+
        '<td class="ta-r">'+(it.precio).toFixed(2)+'</td>'+
        '<td class="ta-r">'+(it.cant*it.precio).toFixed(2)+'</td></tr>';
    }).join('');

    var html = ''
      +'<div class="center brand">'+escapeHtml(config.nombre)+'</div>'
      +(config.ruc? '<div class="center">RUC: '+escapeHtml(config.ruc)+'</div>' : '')
      +(config.direccion? '<div class="center">'+escapeHtml(config.direccion)+'</div>' : '')
      +(config.telefono? '<div class="center">'+escapeHtml(config.telefono)+'</div>' : '')
      +'<div class="divider"></div>'
      +'<div class="center bold">BOLETA DE VENTA / RECIBO</div>'
      +'<div class="center">'+numero+'</div>'
      +'<div class="divider"></div>'
      +'<div>Fecha: '+fecha+'</div>'
      +'<div>Forma de pago: '+escapeHtml(pago)+'</div>'
      +'<div>Cliente: '+escapeHtml(cliente)+'</div>'
      +'<div>'+escapeHtml(tipoDoc)+': '+escapeHtml(numDoc)+'</div>'
      +(direccion? '<div>Dirección: '+escapeHtml(direccion)+'</div>' : '')
      +'<div>Atendido por: '+escapeHtml(config.atendido||'Ventas')+'</div>'
      +'<div class="divider"></div>'
      +'<table><thead><tr><th>Cant</th><th>Descripción</th><th class="ta-r">P.U.</th><th class="ta-r">Total</th></tr></thead>'
      +'<tbody>'+(rowsHtml || '<tr><td colspan="4" class="small">Sin ítems</td></tr>')+'</tbody></table>'
      +'<div class="divider"></div>'
      +'<div class="totals">'
      +'<div><span>Op. gravada</span><span>S/ '+t.opGravada.toFixed(2)+'</span></div>'
      +'<div><span>IGV (18%)</span><span>S/ '+t.igv.toFixed(2)+'</span></div>'
      +'<div class="bold"><span>TOTAL</span><span>S/ '+t.total.toFixed(2)+'</span></div>'
      +'</div>'
      +'<div class="divider"></div>'
      +'<div class="small">'+montoALetras(t.total)+'</div>'
      +'<div class="qr" id="qrHolder"></div>'
      +'<div>PAGO:</div>'
      +'<div>* '+escapeHtml(pago)+' - S/ '+t.total.toFixed(2)+'</div>'
      +'<div class="divider"></div>'
      +'<div class="center small">Autorizado mediante resolución Nro.<br>'+escapeHtml(config.resolucion||'0180050000781/SUNAT')+'.</div>'
      +'<div class="center small">Representación impresa de la BOLETA DE VENTA ELECTRONICA</div>';

    document.getElementById('ticket').innerHTML = html;

    try{
      var qrHolder = document.getElementById('qrHolder');
      if(window.QRCode && qrHolder){
        new QRCode(qrHolder, {
          text: config.qrTexto || '20608273621',
          width:80, height:80, correctLevel: QRCode.CorrectLevel.M
        });
      }
    }catch(e){}
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // ---------- history ----------
  function renderHistorial(){
    var body = document.getElementById('histBody');
    var empty = document.getElementById('histEmpty');
    body.innerHTML = '';
    if(historial.length===0){ empty.style.display='block'; return; }
    empty.style.display='none';
    historial.slice().reverse().forEach(function(h){
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>'+h.numero+'</td><td>'+h.fecha+'</td><td>'+escapeHtml(h.cliente)+'</td>'
        +'<td>S/ '+h.total.toFixed(2)+'</td><td>'+escapeHtml(h.pago)+'</td><td></td>';
      var tdBtn = tr.lastElementChild;
      var btn = document.createElement('button');
      btn.className = 'link-btn';
      btn.textContent = 'Ver / reimprimir';
      btn.addEventListener('click', function(){
        renderTicket(h.numero, h.fecha);
        window.scrollTo({top:0, behavior:'smooth'});
      });
      tdBtn.appendChild(btn);
      body.appendChild(tr);
    });
  }

  function setStatus(msg){
    var el = document.getElementById('statusMsg');
    el.textContent = msg;
    if(msg) setTimeout(function(){ if(el.textContent===msg) el.textContent=''; }, 3500);
  }

  // ---------- events ----------
  function bindEvents(){
    document.getElementById('btnAddItem').addEventListener('click', function(){
      items.push(newItem());
      renderItems();
      renderTicket();
    });

    document.getElementById('btnAddCatalogo').addEventListener('click', async function(){
      var nombre = document.getElementById('catNombre').value.trim();
      var precio = Number(document.getElementById('catPrecio').value)||0;
      if(!nombre) return;
      catalogo.push({nombre:nombre, precio:precio});
      document.getElementById('catNombre').value='';
      document.getElementById('catPrecio').value='';
      renderCatalogo();
      await saveCatalogo();
    });

    document.getElementById('btnGuardarConfig').addEventListener('click', async function(){
      config.nombre = document.getElementById('cfgNombre').value || 'Mi Empresa S.A.C.';
      config.ruc = document.getElementById('cfgRuc').value;
      config.direccion = document.getElementById('cfgDireccion').value;
      config.telefono = document.getElementById('cfgTelefono').value;
      config.atendido = document.getElementById('cfgAtendido').value;
      config.serie = document.getElementById('cfgSerie').value || 'B001';
      config.correlativo = Number(document.getElementById('cfgCorrelativo').value)||1;
      config.qrTexto = document.getElementById('cfgQrTexto').value || '20608273621';
      config.resolucion = document.getElementById('cfgResolucion').value || '0180050000781/SUNAT';
      await saveConfig();
      renderTicket();
      setStatus('Datos de la empresa guardados.');
      document.getElementById('configCard').removeAttribute('open');
    });

    ['cliTipoDoc','cliNumDoc','cliNombre','cliDireccion','cliTelefono','formaPago'].forEach(function(id){
      document.getElementById(id).addEventListener('input', function(){ renderTicket(); });
      document.getElementById(id).addEventListener('change', function(){ renderTicket(); });
    });

    document.getElementById('btnEmitir').addEventListener('click', async function(){
      if(items.length===0){ setStatus('Agrega al menos un ítem antes de emitir.'); return; }
      var t = computeTotals();
      var numero = currentNumero();
      var fecha = fechaHoraActual();
      var cliente = document.getElementById('cliNombre').value || 'Cliente genérico';
      var pago = document.getElementById('formaPago').value;

      renderTicket(numero, fecha);

      historial.push({
        numero:numero, fecha:fecha, cliente:cliente, pago:pago,
        total:t.total, items: JSON.parse(JSON.stringify(items))
      });
      config.correlativo = config.correlativo + 1;
      document.getElementById('cfgCorrelativo').value = config.correlativo;

      await saveHistorial();
      await saveConfig();
      renderHistorial();
      setStatus('Boleta ' + numero + ' emitida y guardada.');
    });

    document.getElementById('btnPrint').addEventListener('click', function(){
      window.print();
    });

    document.getElementById('btnExportarHistorial').addEventListener('click', function(){
      var contenido = JSON.stringify(historial, null, 2);
      var archivo = new Blob([contenido], {type:'application/json;charset=utf-8'});
      var url = URL.createObjectURL(archivo);
      var enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'historial-boletas.json';
      enlace.click();
      URL.revokeObjectURL(url);
      setStatus('Historial descargado en formato JSON.');
    });
  }

  // ---------- init ----------
  async function init(){
    await loadAll();
    fillConfigForm();
    renderCatalogo();
    if(items.length===0){ items.push(newItem()); }
    renderItems();
    renderTicket();
    renderHistorial();
    bindEvents();
  }

  init();
})();
