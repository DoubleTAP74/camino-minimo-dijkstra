/* ----------------------------------------------------------------------------
   bateria.js

   Las comprobaciones, en un solo sitio. Lo usan los dos lanzadores:

     - verificacion.html         se abre con doble clic, en cualquier navegador
     - verificar_programa.js     se ejecuta desde la consola con node

   Asi los dos dan exactamente los mismos numeros, que son los que aparecen en
   la Tabla 2 del informe.

   Necesita que algoritmo.js este cargado antes (de ahi salen generarAleatorio,
   dijkstraPasos, listaAristas, alcanzablesDesde, nombre y grafoDeLaLectura).
   ---------------------------------------------------------------------------- */

function ejecutarBateria(repeticiones) {

  /* Semilla fija. Reemplazamos Math.random por una formula sencilla que da
     siempre la misma secuencia, para que la bateria sea reproducible: cualquiera
     que la ejecute obtiene los numeros del informe. */
  const randomOriginal = Math.random;
  let semilla = 20261108;
  Math.random = function () {
    semilla = (semilla * 1103515245 + 12345) % 2147483648;
    return semilla / 2147483648;
  };

  /* ---------- metodo 1 de contraste: Bellman-Ford ----------
     Escrito aqui a proposito: no llama a nada de algoritmo.js, asi que un error
     en nuestro Dijkstra no puede repetirse igual en este. */
  function bellmanFord(g, origen) {
    const d = new Array(g.n).fill(Infinity);
    d[origen] = 0;
    const aristas = listaAristas(g);
    for (let i = 0; i < g.n - 1; i++) {
      let cambio = false;
      for (const a of aristas) {
        if (d[a.desde] !== Infinity && d[a.desde] + a.peso < d[a.hasta]) {
          d[a.hasta] = d[a.desde] + a.peso;
          cambio = true;
        }
      }
      if (!cambio) break;
    }
    return d;
  }

  /* ---------- metodo 2 de contraste: enumerar TODOS los caminos ---------- */
  function todosLosCaminos(g, origen, destino) {
    const encontrados = [];
    const actual = [origen];
    (function seguir(v, suma) {
      if (encontrados.length > 20000) return;          // tope de seguridad
      if (v === destino) { encontrados.push({ ruta: actual.slice(), suma: suma }); return; }
      for (const w in g.ady[v]) {
        const u = Number(w);
        actual.push(u);
        seguir(u, suma + g.ady[v][u]);
        actual.pop();
      }
    })(origen, 0);
    return encontrados;
  }

  /* ---------- deteccion de ciclos, por si el generador fallara ---------- */
  function tieneCiclo(g) {
    const estado = new Array(g.n).fill(0);             // 0 sin ver, 1 en curso, 2 cerrado
    let hay = false;
    function visitar(v) {
      estado[v] = 1;
      for (const w in g.ady[v]) {
        const u = Number(w);
        if (estado[u] === 1) { hay = true; return; }
        if (estado[u] === 0) visitar(u);
      }
      estado[v] = 2;
    }
    for (let v = 0; v < g.n && !hay; v++) if (estado[v] === 0) visitar(v);
    return hay;
  }

  const c = {
    grafos: 0, casos: 0, totalAristas: 0,
    ciclos: 0, gradoExcedido: 0, callejones: 0, inalcanzables: 0,
    distinta: 0, etiquetaDistinta: 0,
    casosFuerzaBruta: 0, caminosEnumerados: 0, conteoDistinto: 0,
    caminoInvalido: 0, caminoNoMinimo: 0, conMasDeUnCamino: 0,
  };
  const ejemplos = [];
  const cronometro = { total: 0, veces: 0 };

  /* ======================= los tres bucles ======================= */
  for (let n = 7; n <= 16; n++) {                       // 10 tamanios
    for (let r = 0; r < repeticiones; r++) {            // tantos grafos de cada uno
      const g = generarAleatorio(n, 0.5, 1, 9);
      c.grafos++;
      c.totalAristas += listaAristas(g).length;

      // --- lo que debe cumplir el grafo generado ---
      if (tieneCiclo(g)) c.ciclos++;
      const entran = new Array(n).fill(0), salen = new Array(n).fill(0);
      for (const a of listaAristas(g)) { salen[a.desde]++; entran[a.hasta]++; }
      for (let i = 0; i < n; i++) if (entran[i] > 3 || salen[i] > 3) { c.gradoExcedido++; break; }
      let sinSalida = 0;
      for (let i = 0; i < n; i++) if (salen[i] === 0) sinSalida++;
      if (sinSalida !== 1) c.callejones++;
      const alcanzables = new Set(alcanzablesDesde(g, 0));
      for (let i = 1; i < n; i++) if (!alcanzables.has(i)) { c.inalcanzables++; break; }

      // --- lo que debe cumplir el algoritmo, para cada destino ---
      const bf = bellmanFord(g, 0);
      for (let destino = 1; destino < n; destino++) {
        if (!alcanzables.has(destino)) continue;
        c.casos++;

        const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
        const pasos = dijkstraPasos(g, 0, destino);
        const t1 = (typeof performance !== 'undefined') ? performance.now() : 0;
        if (n === 16) { cronometro.total += t1 - t0; cronometro.veces++; }
        const fin = pasos[pasos.length - 1];

        // distancia al destino y etiqueta de todos los vertices
        if (fin.etiquetas[destino].d !== bf[destino]) c.distinta++;
        for (let v = 0; v < n; v++) {
          const e = fin.etiquetas[v];
          const esperado = bf[v] === Infinity ? null : bf[v];
          if ((e === null ? null : e.d) !== esperado) { c.etiquetaDistinta++; break; }
        }

        // cantidad de caminos, contra la enumeracion completa
        if (n <= 11) {
          c.casosFuerzaBruta++;
          const todos = todosLosCaminos(g, 0, destino);
          c.caminosEnumerados += todos.length;
          const minimo = Math.min.apply(null, todos.map(x => x.suma));
          const cuantos = todos.filter(x => x.suma === minimo).length;
          if (cuantos !== fin.cantidadCaminos) {
            c.conteoDistinto++;
            if (ejemplos.length < 3) ejemplos.push({ n: n, destino: destino, esperado: cuantos, obtenido: fin.cantidadCaminos });
          }
        }
        if (fin.cantidadCaminos > 1) c.conMasDeUnCamino++;

        // cada camino informado existe y suma la distancia minima
        for (const camino of fin.caminos) {
          let suma = 0, valido = true;
          for (let i = 0; i + 1 < camino.length; i++) {
            const u = camino[i], v = camino[i + 1];
            if (!(v in g.ady[u])) { valido = false; break; }
            suma += g.ady[u][v];
          }
          if (!valido) c.caminoInvalido++;
          else if (suma !== fin.etiquetas[destino].d) c.caminoNoMinimo++;
        }
      }
    }
  }

  // --- el ejemplo resuelto de la Lectura 5 ---
  const gl = grafoDeLaLectura();
  const pl = dijkstraPasos(gl, 0, 7);
  const fl = pl[pl.length - 1];
  const lectura = {
    distancia: fl.etiquetas[7].d,
    caminos: fl.cantidadCaminos,
    rutas: fl.caminos.map(x => x.map(nombre).join(' → ')),
    etiquetas: fl.etiquetas.map((e, i) => nombre(i) + '=' + (e === null ? '—' : e.d)).join(' '),
  };

  Math.random = randomOriginal;        // dejamos todo como estaba

  const fallos = c.ciclos + c.gradoExcedido + c.callejones + c.inalcanzables +
                 c.distinta + c.etiquetaDistinta + c.conteoDistinto +
                 c.caminoInvalido + c.caminoNoMinimo;

  return { cuenta: c, ejemplos: ejemplos, lectura: lectura, cronometro: cronometro, fallos: fallos };
}

/* ---------- el informe de texto, igual para los dos lanzadores ---------- */
function informeBateria(r) {
  const c = r.cuenta;
  const fila = (texto, valor) => texto + ' '.repeat(Math.max(1, 38 - texto.length)) + valor;
  const L = [];
  L.push('================= VERIFICACION DEL PROGRAMA =================');
  L.push(fila('grafos generados (n = 7 a 16)', c.grafos));
  L.push(fila('aristas en total', c.totalAristas));
  L.push(fila('pares origen-destino comprobados', c.casos));
  L.push('');
  L.push('--- lo que debe cumplir el grafo generado ---');
  L.push(fila('grafos con algun ciclo', c.ciclos));
  L.push(fila('grafos que exceden el grado 3/3', c.gradoExcedido));
  L.push(fila('grafos con callejones sin salida', c.callejones));
  L.push(fila('grafos con vertices inalcanzables', c.inalcanzables));
  L.push('');
  L.push('--- nuestro Dijkstra contra la otra implementacion ---');
  L.push(fila('distancias al destino distintas', c.distinta));
  L.push(fila('casos con alguna etiqueta distinta', c.etiquetaDistinta));
  L.push('');
  L.push('--- caminos minimos ---');
  L.push(fila('casos contrastados por fuerza bruta', c.casosFuerzaBruta + '   (n <= 11)'));
  L.push(fila('caminos enumerados uno por uno', c.caminosEnumerados));
  L.push(fila('conteos distintos de la fuerza bruta', c.conteoDistinto));
  L.push(fila('caminos reportados inexistentes', c.caminoInvalido));
  L.push(fila('caminos reportados no minimos', c.caminoNoMinimo));
  L.push(fila('casos con mas de un camino minimo',
    c.conMasDeUnCamino + '   (' + (100 * c.conMasDeUnCamino / c.casos).toFixed(1) + ' %)'));
  if (r.ejemplos.length) L.push('ejemplos de desacuerdo: ' + JSON.stringify(r.ejemplos));
  L.push('');
  L.push('--- ejemplo resuelto de la Lectura 5 ---');
  L.push(fila('distancia A -> H', r.lectura.distancia));
  L.push(fila('cantidad de caminos minimos', r.lectura.caminos));
  L.push(fila('rutas', r.lectura.rutas.join('  |  ')));
  L.push(fila('etiquetas finales', r.lectura.etiquetas));
  L.push('');
  if (r.cronometro.veces > 0) {
    L.push(fila('tiempo medio de una ejecucion n = 16',
      (r.cronometro.total / r.cronometro.veces).toFixed(3) + ' ms   (' + r.cronometro.veces + ' ejecuciones)'));
    L.push('');
  }
  L.push('=============================================================');
  L.push(r.fallos === 0 ? 'RESULTADO: CORRECTO, 0 discrepancias'
                        : 'RESULTADO: ' + r.fallos + ' DISCREPANCIAS');
  return L.join('\n');
}
