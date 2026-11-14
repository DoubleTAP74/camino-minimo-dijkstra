/* ============================================================================
   interfaz.js
   Todo lo que tiene que ver con la pantalla: dibujar el grafo, llenar las
   tablas y responder a los botones. La matematica esta en algoritmo.js.
   ============================================================================ */

// ------------------------------- estado ------------------------------------
let grafo = null;
let pasos = [];
let indicePaso = -1;
let origen = null;
let destino = null;
let posiciones = [];        // posiciones[i] = { x, y, fijo } del vertice i

// edicion por clic sobre el lienzo
let verticeElegido = null;  // primer vertice de la arista que se esta creando
let aristaPendiente = null; // [u, v] esperando que se escriba el peso
let arrastre = null;        // { i, movido } mientras se arrastra un vertice

const $ = function (id) { return document.getElementById(id); };

const lienzo = $("lienzo");
const ctx = lienzo.getContext("2d");

const RADIO = 21;           // radio de los circulos de los vertices

/* Cada vértice tiene su color. Las aristas heredan el color de su vértice de
   origen, así se puede seguir una línea con la vista aunque se cruce con otras.
   Son tonos medios sobre fondo blanco; el rojo y el naranja quedan reservados
   para el camino mínimo y para las aristas que se revisan en la iteración. */
const COLORES = [
  "#1f6feb", "#0e7c66", "#7048c4", "#b03060", "#2d7d2d", "#2a6f97", "#8a6d1f", "#a0522d",
  "#5b2c8d", "#107a6e", "#9c4f96", "#4a7023", "#1d5fa8", "#86592d", "#6b3fa0", "#0f7a7a"
];

function colorDe(i) { return COLORES[i % COLORES.length]; }

// versión clara del color, para rellenar el círculo del vértice
function colorClaro(i) {
  const c = colorDe(i);
  return c + "1f";   // el mismo color con poca opacidad (alfa en hexadecimal)
}



/* ----------------------------------------------------------------------------
   1. Donde dibujamos cada vertice

   Aqui esta la idea que mas nos ayudo visualmente. Como el grafo no tiene
   ciclos, podemos acomodar los vertices en niveles: el nivel de un vertice es
   la cantidad de aristas del camino mas largo que llega hasta el. Si ponemos
   cada nivel en una columna, TODAS las flechas apuntan hacia la derecha y el
   dibujo deja de ser una maraña de lineas cruzandose por el centro.

   Con el grafo en circulo (que fue nuestra primera version) con n = 16 no se
   entendia nada. Asi se lee de corrido, de izquierda a derecha.
   ---------------------------------------------------------------------------- */

function calcularNiveles(g) {
  const nivel = new Array(g.n).fill(0);

  // Primero un orden topologico (algoritmo de Kahn): vamos sacando los
  // vertices que ya no tienen flechas entrantes pendientes.
  const gradoEntrada = new Array(g.n).fill(0);
  for (let u = 0; u < g.n; u++) {
    for (const v in g.ady[u]) gradoEntrada[Number(v)]++;
  }

  const cola = [];
  for (let i = 0; i < g.n; i++) if (gradoEntrada[i] === 0) cola.push(i);

  const orden = [];
  while (cola.length > 0) {
    const u = cola.shift();
    orden.push(u);
    for (const v in g.ady[u]) {
      const w = Number(v);
      gradoEntrada[w]--;
      if (gradoEntrada[w] === 0) cola.push(w);
    }
  }

  // Recorriendo en ese orden, cada vertice queda un nivel mas a la derecha que
  // el mas lejano de los que le apuntan.
  for (const u of orden) {
    for (const v in g.ady[u]) {
      const w = Number(v);
      if (nivel[u] + 1 > nivel[w]) nivel[w] = nivel[u] + 1;
    }
  }
  return nivel;
}

function calcularPosiciones(g) {
  const nivel = calcularNiveles(g);
  const maxNivel = Math.max.apply(null, nivel);

  // agrupamos los vertices por columna
  const columnas = [];
  for (let i = 0; i <= maxNivel; i++) columnas.push([]);
  for (let v = 0; v < g.n; v++) columnas[nivel[v]].push(v);

  // Una pasada de "baricentro": dentro de cada columna ordenamos los vertices
  // segun la altura promedio de los que le apuntan. Eso destuerce bastantes
  // cruces sin complicar el codigo.
  const alturaPrevia = new Array(g.n).fill(0);
  for (let c = 0; c <= maxNivel; c++) {
    if (c > 0) {
      columnas[c].sort(function (a, b) {
        return promedioEntrantes(g, a, alturaPrevia) - promedioEntrantes(g, b, alturaPrevia);
      });
    }
    for (let k = 0; k < columnas[c].length; k++) alturaPrevia[columnas[c][k]] = k / columnas[c].length;
  }

  const ancho = lienzo.clientWidth;
  const alto = lienzo.clientHeight;
  const margenX = 58, margenY = 46;

  /* Caso aparte: el grafo vacio del modo manual. Sin aristas todos los
     vertices quedan en el nivel 0, o sea apilados en una sola columna, y
     resulta incomodo hacerles clic. Mientras no haya ninguna arista los
     repartimos en una cuadricula que ocupa el lienzo; en cuanto aparece la
     primera arista ya mandan los niveles. */
  if (maxNivel === 0) {
    const columnas = Math.ceil(Math.sqrt(g.n * 1.8));
    const filas = Math.ceil(g.n / columnas);
    const separacion = 140;                                  // entre fila y fila
    const altoBloque = (filas - 1) * separacion;             // lo centramos
    const arriba = (alto - altoBloque) / 2;
    const pos0 = new Array(g.n);
    for (let i = 0; i < g.n; i++) {
      const c = i % columnas, f = Math.floor(i / columnas);
      pos0[i] = {
        x: margenX + (ancho - 2 * margenX) * (columnas === 1 ? 0.5 : c / (columnas - 1)),
        y: arriba + f * separacion
      };
    }
    for (let i = 0; i < g.n; i++) {
      if (posiciones[i] && posiciones[i].fijo) pos0[i] = posiciones[i];
    }
    return pos0;
  }

  const pasoX = (ancho - 2 * margenX) / maxNivel;

  const pos = new Array(g.n);
  for (let c = 0; c <= maxNivel; c++) {
    const col = columnas[c];
    const x = margenX + c * pasoX;
    const utilizable = alto - 2 * margenY;
    for (let k = 0; k < col.length; k++) {
      const y = col.length === 1
        ? alto / 2
        : margenY + utilizable * (k / (col.length - 1));
      pos[col[k]] = { x: x, y: y };
    }
  }

  // Un vertice que el usuario arrastro se queda donde lo dejo. Si se
  // recolocaran todos en cada cambio, el grafo saltaria mientras se edita.
  for (let i = 0; i < g.n; i++) {
    if (posiciones[i] && posiciones[i].fijo) pos[i] = posiciones[i];
  }
  return pos;
}

function promedioEntrantes(g, v, altura) {
  let suma = 0, cuantos = 0;
  for (let u = 0; u < g.n; u++) {
    if (v in g.ady[u]) { suma += altura[u]; cuantos++; }
  }
  return cuantos === 0 ? 0.5 : suma / cuantos;
}


/* ----------------------------------------------------------------------------
   2. Dibujo del grafo
   ---------------------------------------------------------------------------- */

function ajustarLienzo() {
  const escala = window.devicePixelRatio || 1;
  lienzo.width = lienzo.clientWidth * escala;
  lienzo.height = lienzo.clientHeight * escala;
  ctx.setTransform(escala, 0, 0, escala, 0, 0);
}

function dibujar() {
  ajustarLienzo();
  ctx.clearRect(0, 0, lienzo.clientWidth, lienzo.clientHeight);

  if (grafo === null) {
    ctx.fillStyle = "#99a5b2";
    ctx.font = "15px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Genere un grafo para comenzar", lienzo.clientWidth / 2, lienzo.clientHeight / 2);
    return;
  }

  /* Antes de nada reservamos el espacio que van a ocupar los vertices y sus
     etiquetas [d, V]n. Asi el peso de una arista nunca se dibuja encima de un
     circulo ni de una etiqueta: el docente pidio en la revision que todos los
     datos se vean, que ninguno quede tapado. */
  etiquetasColocadas = [];
  if (grafo !== null) {
    const pasoActual = indicePaso >= 0 ? pasos[indicePaso] : null;
    for (let i = 0; i < grafo.n; i++) {
      const p = posiciones[i];
      etiquetasColocadas.push({ x: p.x - RADIO, y: p.y - RADIO, w: 2 * RADIO, h: 2 * RADIO });
      if (pasoActual !== null && pasoActual.etiquetas[i] !== null) {
        const e = pasoActual.etiquetas[i];
        const texto = "[" + e.d + ", " + (e.pred === null ? "-" : nombre(e.pred)) + "]" + e.iter;
        ctx.font = "bold 11.5px 'Consolas', monospace";
        const ancho = ctx.measureText(texto).width + 8;
        etiquetasColocadas.push({ x: p.x - ancho / 2, y: p.y - RADIO - 20, w: ancho, h: 17 });
      }
    }
  }

  const paso = indicePaso >= 0 ? pasos[indicePaso] : null;

  /* Aristas que pertenecen a algun camino minimo, para pintarlas en rojo.
     Se resaltan TODAS, no solo las de un camino: cuando hay empates el
     enunciado pide mostrar cada una de las rutas de longitud minima. */
  const enRuta = new Set();
  if (paso !== null && paso.final && paso.aristasMinimas) {
    for (const a of paso.aristasMinimas) enRuta.add(a[0] + "-" + a[1]);
  }

  // aristas que se acaban de revisar en esta iteracion
  const revisadas = {};
  if (paso !== null) {
    for (const r of paso.relajadas) revisadas[r[0] + "-" + r[1]] = r[2];
  }

  // --- aristas ---
  for (let u = 0; u < grafo.n; u++) {
    for (const v in grafo.ady[u]) {
      const w = Number(v);
      const clave = u + "-" + w;
      let color = colorDe(u), grosor = 1.5;

      if (clave in revisadas) {
        color = revisadas[clave] ? "#e07b1a" : "#7d93a8";
        grosor = revisadas[clave] ? 3 : 2;
      }
      if (enRuta.has(clave)) { color = "#c0392b"; grosor = 3.6; }

      dibujarFlecha(posiciones[u], posiciones[w], grafo.ady[u][v], color, grosor);
    }
  }

  // --- vertices ---
  for (let i = 0; i < grafo.n; i++) {
    const p = posiciones[i];
    let relleno = "#ffffff", borde = colorDe(i), grosorBorde = 2.2;

    if (paso !== null && paso.visitados[i]) relleno = colorClaro(i);
    if (paso !== null && paso.actual === i && !paso.final) { relleno = "#fde3c4"; borde = "#e07b1a"; grosorBorde = 3.4; }
    if (verticeElegido === i) { relleno = "#fde3c4"; borde = "#e07b1a"; grosorBorde = 3.6; }
    if (i === origen)  { borde = "#1a8a4a"; grosorBorde = 3.6; }
    if (i === destino) { borde = "#c0392b"; grosorBorde = 3.6; }

    ctx.beginPath();
    ctx.arc(p.x, p.y, RADIO, 0, Math.PI * 2);
    ctx.fillStyle = relleno; ctx.fill();
    ctx.lineWidth = grosorBorde; ctx.strokeStyle = borde; ctx.stroke();

    ctx.fillStyle = colorDe(i);
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(nombre(i), p.x, p.y);

    // la etiqueta [d, V]n va justo encima del vertice
    if (paso !== null && paso.etiquetas[i] !== null) {
      const e = paso.etiquetas[i];
      const texto = "[" + e.d + ", " + (e.pred === null ? "-" : nombre(e.pred)) + "]" + e.iter;
      ctx.font = "bold 11.5px 'Consolas', monospace";
      const ancho = ctx.measureText(texto).width;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(p.x - ancho / 2 - 4, p.y - RADIO - 19, ancho + 8, 15);
      ctx.fillStyle = colorDe(i);
      ctx.fillText(texto, p.x, p.y - RADIO - 11.5);
    }
  }
}

function dibujarFlecha(a, b, peso, color, grosor) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const largo = Math.hypot(dx, dy);
  if (largo === 0) return;
  const ux = dx / largo, uy = dy / largo;

  // la flecha arranca y termina en el borde del circulo, no en el centro
  const x1 = a.x + ux * RADIO, y1 = a.y + uy * RADIO;
  const x2 = b.x - ux * RADIO, y2 = b.y - uy * RADIO;

  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = grosor; ctx.stroke();

  // punta
  const ang = Math.atan2(dy, dx), L = 10, abre = 0.42;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - L * Math.cos(ang - abre), y2 - L * Math.sin(ang - abre));
  ctx.lineTo(x2 - L * Math.cos(ang + abre), y2 - L * Math.sin(ang + abre));
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();

  colocarPeso(x1, y1, x2, y2, peso, color);
}

/* Coloca el numero del peso sobre la arista.

   Si todas las etiquetas se ponen en la mitad exacta, con muchas aristas se
   enciman y no se lee ninguna. Asi que probamos varias posiciones a lo largo
   de la arista y nos quedamos con la primera que no choque con una etiqueta ya
   dibujada. Vamos guardando los rectangulos ocupados en una lista. */
let etiquetasColocadas = [];

function colocarPeso(x1, y1, x2, y2, peso, color) {
  const texto = String(peso);
  ctx.font = "bold 12px 'Segoe UI', sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  const ancho = ctx.measureText(texto).width + 7;
  const alto = 15;

  /* Se prueban varias posiciones a lo largo de la arista y, si todas chocan,
     tambien algunas separadas perpendicularmente a ella. Se toma la primera
     que quede libre; asi el numero no se encima con otro ni con un vertice. */
  const largoX = x2 - x1, largoY = y2 - y1;
  const largo = Math.hypot(largoX, largoY) || 1;
  const perpX = -largoY / largo, perpY = largoX / largo;   // vector perpendicular unitario

  const candidatos = [];
  for (const t of [0.42, 0.33, 0.52, 0.25, 0.62, 0.72]) candidatos.push([t, 0]);
  for (const t of [0.42, 0.33, 0.52]) { candidatos.push([t, 13]); candidatos.push([t, -13]); }

  let elegido = null;
  for (const c of candidatos) {
    const cx = x1 + largoX * c[0] + perpX * c[1];
    const cy = y1 + largoY * c[0] + perpY * c[1];
    const r = { x: cx - ancho / 2, y: cy - alto / 2, w: ancho, h: alto };
    if (!chocaConAlguna(r)) { elegido = { cx: cx, cy: cy, r: r }; break; }
  }
  if (elegido === null) {
    const cx = x1 + largoX * 0.42, cy = y1 + largoY * 0.42;
    elegido = { cx: cx, cy: cy, r: { x: cx - ancho / 2, y: cy - alto / 2, w: ancho, h: alto } };
  }
  etiquetasColocadas.push(elegido.r);

  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(elegido.r.x, elegido.r.y, elegido.r.w, elegido.r.h);
  ctx.fillStyle = color;
  ctx.fillText(texto, elegido.cx, elegido.cy);
}

function chocaConAlguna(r) {
  for (const o of etiquetasColocadas) {
    if (r.x < o.x + o.w && r.x + r.w > o.x && r.y < o.y + o.h && r.y + r.h > o.y) return true;
  }
  return false;
}


/* ----------------------------------------------------------------------------
   3. Tablas y textos
   ---------------------------------------------------------------------------- */

function actualizarTablaEtiquetas() {
  const cuerpo = $("tablaEtiquetas").querySelector("tbody");
  cuerpo.innerHTML = "";
  if (grafo === null) return;

  const paso = indicePaso >= 0 ? pasos[indicePaso] : null;

  for (let i = 0; i < grafo.n; i++) {
    const fila = document.createElement("tr");
    const e = paso === null ? null : paso.etiquetas[i];

    let etiqueta = "—", d = "—", pred = "—", iter = "—", estado = "Sin etiqueta";

    if (e !== null) {
      const letraPred = e.pred === null ? "-" : nombre(e.pred);
      etiqueta = "[" + e.d + ", " + letraPred + "]" + e.iter;
      d = e.d; pred = letraPred; iter = e.iter;
      estado = paso.visitados[i] ? "Visitado" : "Etiquetado";
    }

    if (paso !== null && paso.actual === i && !paso.final) { fila.className = "fila-actual"; estado = "Actual"; }
    else if (paso !== null && paso.visitados[i]) fila.className = "fila-visitado";
    if (i === destino) fila.classList.add("fila-destino");

    fila.innerHTML =
      "<td>" + nombre(i) + (i === origen ? " (origen)" : "") + (i === destino ? " (destino)" : "") + "</td>" +
      "<td class='etiqueta'>" + etiqueta + "</td>" +
      "<td>" + d + "</td><td>" + pred + "</td><td>" + iter + "</td><td>" + estado + "</td>";
    cuerpo.appendChild(fila);
  }
}

function actualizarMatriz() {
  const tabla = $("tablaMatriz");
  const cabeza = tabla.querySelector("thead");
  const cuerpo = tabla.querySelector("tbody");
  cabeza.innerHTML = ""; cuerpo.innerHTML = "";
  if (grafo === null) return;

  const m = matrizAdyacencia(grafo);

  let fila = "<tr><th></th>";
  for (let j = 0; j < grafo.n; j++) fila += "<th>" + nombre(j) + "</th>";
  cabeza.innerHTML = fila + "</tr>";

  for (let i = 0; i < grafo.n; i++) {
    let html = "<tr><th>" + nombre(i) + "</th>";
    for (let j = 0; j < grafo.n; j++) {
      if (i === j) html += "<td class='diagonal'>·</td>";
      else if (m[i][j] === null) html += "<td class='vacio'>—</td>";
      else html += "<td class='con-peso'>" + m[i][j] + "</td>";
    }
    cuerpo.innerHTML += html + "</tr>";
  }
}

function mostrarRegistro() {
  const caja = $("registro");
  if (indicePaso < 0) {
    caja.textContent = "Genere un grafo y pulse «Iniciar» para ver el procedimiento paso a paso.";
    return;
  }
  const p = pasos[indicePaso];
  caja.innerHTML = "<b>" + p.titulo + "</b>\n" + p.detalle.join("\n");
}

function actualizarContadores() {
  $("datoNodos").textContent = grafo === null ? "—" : grafo.n;
  $("datoAristas").textContent = grafo === null ? "—" : listaAristas(grafo).length;

  let dist = "—";
  if (indicePaso >= 0 && destino !== null) {
    const e = pasos[indicePaso].etiquetas[destino];
    if (e !== null) dist = e.d;
  }
  $("datoDistancia").textContent = dist;

  let cuantos = "—";
  if (indicePaso >= 0) {
    const p = pasos[indicePaso];
    if (p.final && p.cantidadCaminos !== undefined && p.cantidadCaminos > 0) cuantos = p.cantidadCaminos;
  }
  $("datoCaminos").textContent = cuantos;

  if (pasos.length > 0 && indicePaso >= 0) {
    $("contadorPaso").textContent = "Paso " + (indicePaso + 1) + " de " + pasos.length;
    $("barraProgreso").style.width = ((indicePaso + 1) / pasos.length * 100) + "%";
  } else {
    $("contadorPaso").textContent = grafo === null ? "Genere un grafo para comenzar" : "Elija origen y destino, y pulse «Iniciar»";
    $("barraProgreso").style.width = "0%";
  }

  $("btnAnterior").disabled = indicePaso <= 0;
  $("btnSiguiente").disabled = indicePaso < 0 || indicePaso >= pasos.length - 1;
}


/* ----------------------------------------------------------------------------
   4. Selectores de vertices
   ---------------------------------------------------------------------------- */

function llenarSelector(sel, marcarAlcanzables) {
  const anterior = sel.value;
  sel.innerHTML = "";
  if (grafo === null) return;

  let alcanzables = null;
  if (marcarAlcanzables && origen !== null) {
    alcanzables = new Set(alcanzablesDesde(grafo, origen));
  }

  for (let i = 0; i < grafo.n; i++) {
    const op = document.createElement("option");
    op.value = i;
    op.textContent = nombre(i) + (alcanzables !== null && alcanzables.has(i) ? " •" : "");
    sel.appendChild(op);
  }
  if (anterior !== "" && Number(anterior) < grafo.n) sel.value = anterior;
}

function refrescarSelectores() {
  llenarSelector($("selOrigen"), false);
  origen = grafo === null ? null : Number($("selOrigen").value);
  llenarSelector($("selDestino"), true);

  if (grafo !== null && origen !== null) {
    const alc = alcanzablesDesde(grafo, origen);
    // si el destino elegido no es alcanzable, proponemos uno que sí lo sea
    if (alc.length > 0 && !alc.includes(Number($("selDestino").value))) {
      $("selDestino").value = alc[alc.length - 1];
    }
  }
  actualizarAyudaAlcanzables();
}

/* Avisa qué destinos tienen camino desde el origen elegido. Como el grafo es
   acíclico, es normal que varios vértices no sean alcanzables: las flechas no
   pueden volver atrás. Mejor decirlo antes de ejecutar que dejar al usuario
   descubrirlo con un "no existe camino". */
function actualizarAyudaAlcanzables() {
  const ayuda = $("ayudaAlcanzables");
  if (grafo === null || origen === null) {
    ayuda.textContent = "Los destinos marcados con • son alcanzables desde el origen.";
    return;
  }
  const alc = alcanzablesDesde(grafo, origen);
  if (alc.length === 0) {
    ayuda.textContent = "Desde " + nombre(origen) + " no se puede llegar a ningún otro vértice. Elija otro origen.";
    $("btnIniciar").disabled = true;
  } else {
    ayuda.textContent = "Desde " + nombre(origen) + " son alcanzables (•): " + alc.map(nombre).join(", ") + ".";
    $("btnIniciar").disabled = false;
  }
}

function avisar(texto, tipo) {
  const p = $("avisoArista");
  p.textContent = texto;
  p.className = "aviso" + (tipo ? " " + tipo : "");
}


/* ----------------------------------------------------------------------------
   5. Acciones de los botones
   ---------------------------------------------------------------------------- */

function leerN() {
  const n = parseInt($("entradaN").value, 10);
  if (isNaN(n) || n < N_MIN || n > N_MAX) {
    avisar("El número de vértices debe ser un entero entre " + N_MIN + " y " + N_MAX + ".", "error");
    return null;
  }
  return n;
}

function cargarGrafo(g) {
  grafo = g;
  pasos = []; indicePaso = -1;
  posiciones = [];                      // ninguna posicion fijada a mano
  verticeElegido = null; aristaPendiente = null;
  if (typeof flotante !== "undefined" && flotante) flotante.style.display = "none";
  posiciones = calcularPosiciones(grafo);

  // Elegimos un origen y un destino por defecto que den una demostración útil,
  // en vez de dejar siempre A y la última letra: en un grafo acíclico ese par
  // muchas veces no tiene camino.
  const par = mejorParOrigenDestino(grafo);
  llenarSelector($("selOrigen"), false);
  $("selOrigen").value = par.origen;
  origen = par.origen;
  llenarSelector($("selDestino"), true);
  $("selDestino").value = par.destino;
  destino = par.destino;
  actualizarAyudaAlcanzables();

  actualizarMatriz();
  actualizarTablaEtiquetas();
  mostrarRegistro();
  actualizarContadores();
  dibujar();
}

$("btnAleatorio").onclick = function () {
  const n = leerN();
  if (n === null) return;
  cargarGrafo(generarAleatorio(n));
  avisar("Grafo aleatorio de " + n + " vértices generado. Es dirigido y acíclico por construcción.", "ok");
};

$("btnManual").onclick = function () {
  const n = leerN();
  if (n === null) return;
  cargarGrafo(crearGrafo(n));
  avisar("Grafo vacío de " + n + " vértices. Agregue las aristas una por una.", "ok");
};

$("btnEjemplo").onclick = function () {
  cargarGrafo(grafoDeLaLectura());
  $("entradaN").value = 8;
  $("selOrigen").value = 0;                 // A
  refrescarSelectores();
  $("selDestino").value = 7;                // H
  destino = 7;
  dibujar();
  avisar("Ejemplo de la Lectura 5, orientado como grafo dirigido acíclico. De A a H la distancia mínima es 8.", "ok");
};

/* ----------------------------------------------------------------------------
   Edicion del grafo con el raton

   Sustituye a los tres desplegables que habia antes. El docente observo en la
   primera revision que ingresar los datos asi resultaba poco dinamico.

   - clic en un vertice y luego en otro  -> crea la arista, pidiendo el peso
   - clic sobre una arista               -> la borra
   - arrastrar un vertice                -> lo mueve de sitio
   ---------------------------------------------------------------------------- */

const flotante = $("flotante");

// convierte la posicion del raton en coordenadas del lienzo
function puntoDelRaton(ev) {
  const r = lienzo.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

function verticeEn(p) {
  for (let i = 0; i < grafo.n; i++) {
    if (Math.hypot(posiciones[i].x - p.x, posiciones[i].y - p.y) <= RADIO + 3) return i;
  }
  return null;
}

/* Busca la arista que pasa por el punto. Para cada una se proyecta el punto
   sobre el segmento y se mide la distancia; si es menor que unos pocos
   pixeles, el clic cae sobre esa arista. */
function aristaEn(p) {
  for (let u = 0; u < grafo.n; u++) {
    for (const v in grafo.ady[u]) {
      const w = Number(v), a = posiciones[u], b = posiciones[w];
      const dx = b.x - a.x, dy = b.y - a.y, largo2 = dx * dx + dy * dy;
      if (largo2 === 0) continue;
      let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / largo2;
      t = Math.max(0, Math.min(1, t));
      if (Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y) < 7) return [u, w];
    }
  }
  return null;
}

// al tocar el grafo se descarta la ejecucion anterior: el grafo cambio
function trasEditar() {
  pasos = []; indicePaso = -1;
  posiciones = calcularPosiciones(grafo);
  refrescarSelectores();
  actualizarMatriz(); actualizarTablaEtiquetas(); mostrarRegistro();
  actualizarContadores(); dibujar();
}

lienzo.addEventListener("mousedown", function (ev) {
  if (grafo === null) return;
  const i = verticeEn(puntoDelRaton(ev));
  if (i !== null) arrastre = { i: i, movido: false };
});

lienzo.addEventListener("mousemove", function (ev) {
  if (arrastre === null) return;
  const p = puntoDelRaton(ev);
  posiciones[arrastre.i] = { x: p.x, y: p.y, fijo: true };
  arrastre.movido = true;
  dibujar();
});

window.addEventListener("mouseup", function () { arrastre = null; });

lienzo.addEventListener("click", function (ev) {
  if (grafo === null) return;
  if (arrastre !== null && arrastre.movido) return;   // fue un arrastre, no un clic

  const p = puntoDelRaton(ev);
  const i = verticeEn(p);

  if (i === null) {
    const ar = aristaEn(p);
    if (ar !== null) {
      quitarArista(grafo, ar[0], ar[1]);
      avisar("Arista " + nombre(ar[0]) + " → " + nombre(ar[1]) + " eliminada.", "ok");
      trasEditar();
      return;
    }
    verticeElegido = null; flotante.style.display = "none";
    avisar("");
    dibujar();
    return;
  }

  if (verticeElegido === null) {
    verticeElegido = i;
    avisar("Origen " + nombre(i) + " elegido. Ahora haga clic en el vértice de destino.");
    dibujar();
    return;
  }
  if (verticeElegido === i) {
    verticeElegido = null;
    avisar("Selección cancelada.");
    dibujar();
    return;
  }

  aristaPendiente = [verticeElegido, i];
  verticeElegido = null;
  dibujar();

  $("flotanteTexto").textContent = nombre(aristaPendiente[0]) + " → " + nombre(aristaPendiente[1]);
  const a = posiciones[aristaPendiente[0]], b = posiciones[aristaPendiente[1]];
  const izq = Math.min(Math.max((a.x + b.x) / 2 - 95, 4), lienzo.clientWidth - 240);
  flotante.style.left = izq + "px";
  flotante.style.top = ((a.y + b.y) / 2 - 20) + "px";
  flotante.style.display = "block";
  $("flotantePeso").value = 1;
  $("flotantePeso").focus();
  $("flotantePeso").select();
});

function confirmarArista() {
  if (aristaPendiente === null) return;
  const u = aristaPendiente[0], v = aristaPendiente[1];
  const error = agregarArista(grafo, u, v, parseInt($("flotantePeso").value, 10));
  if (error !== null) avisar(error, "error");
  else avisar("Arista " + nombre(u) + " → " + nombre(v) + " agregada con peso " + $("flotantePeso").value + ".", "ok");
  aristaPendiente = null;
  flotante.style.display = "none";
  trasEditar();
}

$("flotanteOk").onclick = confirmarArista;
$("flotantePeso").addEventListener("keydown", function (ev) {
  if (ev.key === "Enter") { ev.preventDefault(); confirmarArista(); }
  if (ev.key === "Escape") {
    aristaPendiente = null; flotante.style.display = "none";
    avisar("Cancelado.");
  }
});

// vuelve a acomodar por niveles los vertices que se hayan movido a mano
$("btnReordenar").onclick = function () {
  if (grafo === null) return;
  for (let i = 0; i < posiciones.length; i++) {
    if (posiciones[i]) posiciones[i].fijo = false;
  }
  posiciones = calcularPosiciones(grafo);
  avisar("Vértices reacomodados por niveles.", "ok");
  dibujar();
};

$("selOrigen").onchange = function () {
  origen = Number($("selOrigen").value);
  refrescarSelectores();
  destino = Number($("selDestino").value);
  pasos = []; indicePaso = -1;
  actualizarTablaEtiquetas(); mostrarRegistro(); actualizarContadores(); dibujar();
};

$("selDestino").onchange = function () {
  destino = Number($("selDestino").value);
  pasos = []; indicePaso = -1;
  actualizarTablaEtiquetas(); mostrarRegistro(); actualizarContadores(); dibujar();
};

$("btnIniciar").onclick = function () {
  if (grafo === null) { avisar("Primero cree un grafo.", "error"); return; }
  origen = Number($("selOrigen").value);
  destino = Number($("selDestino").value);
  if (origen === destino) { avisar("El origen y el destino deben ser distintos.", "error"); return; }

  pasos = dijkstraPasos(grafo, origen, destino);
  indicePaso = 0;
  avisar("Algoritmo ejecutado: " + pasos.length + " pasos. Avance con «Siguiente».", "ok");
  actualizarTablaEtiquetas(); mostrarRegistro(); actualizarContadores(); dibujar();
};

function irA(i) {
  if (pasos.length === 0) return;
  indicePaso = Math.max(0, Math.min(pasos.length - 1, i));
  actualizarTablaEtiquetas(); mostrarRegistro(); actualizarContadores(); dibujar();
}

$("btnSiguiente").onclick = function () { irA(indicePaso + 1); };
$("btnAnterior").onclick  = function () { irA(indicePaso - 1); };
$("btnTodo").onclick      = function () { if (pasos.length === 0) $("btnIniciar").onclick(); irA(pasos.length - 1); };

$("btnReiniciar").onclick = function () {
  pasos = []; indicePaso = -1;
  avisar("");
  actualizarTablaEtiquetas(); mostrarRegistro(); actualizarContadores(); dibujar();
};

// las flechas del teclado tambien sirven para avanzar
document.addEventListener("keydown", function (ev) {
  if (ev.key === "ArrowRight") $("btnSiguiente").onclick();
  if (ev.key === "ArrowLeft") $("btnAnterior").onclick();
});

window.addEventListener("resize", function () {
  if (grafo !== null) posiciones = calcularPosiciones(grafo);
  dibujar();
});

// arranque: dejamos un grafo listo para que no se vea vacio al abrir
cargarGrafo(generarAleatorio(8));
avisar("Grafo aleatorio de 8 vértices generado. Es dirigido y acíclico por construcción.", "ok");
