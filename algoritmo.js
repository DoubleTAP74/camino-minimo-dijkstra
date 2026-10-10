/* ============================================================================
   algoritmo.js
   Caso 2 - Problema del camino minimo (algoritmo de Dijkstra)
   Matematica Computacional 1AMA0726 - UPC

   Aqui va toda la parte matematica del proyecto: como guardamos el grafo, como
   lo generamos sin que tenga ciclos y como corremos Dijkstra guardando lo que
   pasa en cada iteracion.

   El dibujo y los botones estan en interfaz.js, asi no se nos mezcla la
   matematica con la pantalla.

   Notacion de las etiquetas (la misma de la Lectura 5 del curso):

        [d, V]n      d = distancia acumulada desde el origen
                     V = vertice de procedencia (de donde venimos)
                     n = iteracion en la que se puso la etiqueta
   ============================================================================ */

const N_MIN = 7;    // el enunciado pide n entre 7 y 16
const N_MAX = 16;
const INF = Infinity;

// 0 -> "A", 1 -> "B", ... Con n <= 16 llegamos hasta la "P", asi que alcanza.
function nombre(i) {
  return String.fromCharCode(65 + i);
}

// "A" -> 0, "B" -> 1, ...
function indice(letra) {
  return letra.charCodeAt(0) - 65;
}


/* ----------------------------------------------------------------------------
   1. El grafo
   Lo guardamos como lista de adyacencia: ady[u] es un objeto { v: peso }.
   Es dirigido, o sea que ady[u][v] NO implica que exista ady[v][u].
   ---------------------------------------------------------------------------- */

function crearGrafo(n) {
  const ady = [];
  for (let i = 0; i < n; i++) ady.push({});
  return { n: n, ady: ady };
}

// Lista plana de aristas, util para dibujar y para la matriz.
function listaAristas(g) {
  const aristas = [];
  for (let u = 0; u < g.n; u++) {
    for (const v in g.ady[u]) {
      aristas.push({ desde: u, hasta: Number(v), peso: g.ady[u][v] });
    }
  }
  return aristas;
}

// Busqueda en profundidad: existe un camino dirigido de a hasta b?
// La usamos para dos cosas: detectar ciclos y saber que destinos son alcanzables.
function hayCamino(g, a, b) {
  const pila = [a];
  const visto = new Set([a]);
  while (pila.length > 0) {
    const x = pila.pop();
    if (x === b) return true;
    for (const y in g.ady[x]) {
      const w = Number(y);
      if (!visto.has(w)) {
        visto.add(w);
        pila.push(w);
      }
    }
  }
  return false;
}

/* Agrega la arista u -> v validando todo lo que pide el enunciado.
   Si algo esta mal devuelve el mensaje de error; si todo bien devuelve null.

   El truco para que el grafo no tenga ciclos: antes de agregar u -> v
   preguntamos si ya se puede llegar de v a u. Si se puede, cerrar u -> v
   armaria un ciclo, asi que la rechazamos. */
function agregarArista(g, u, v, peso) {
  if (u === v) return "No se permiten lazos: el origen y el destino de la arista deben ser distintos.";
  if (!Number.isInteger(peso) || peso <= 0) return "El peso debe ser un número entero positivo.";
  if (v in g.ady[u]) return "La arista " + nombre(u) + " → " + nombre(v) + " ya existe.";
  if (hayCamino(g, v, u)) {
    return "La arista " + nombre(u) + " → " + nombre(v) + " formaría un ciclo, porque ya existe un camino de " +
           nombre(v) + " a " + nombre(u) + ". El grafo debe ser acíclico.";
  }
  g.ady[u][v] = peso;
  return null;
}

function quitarArista(g, u, v) {
  if (!(v in g.ady[u])) return "La arista " + nombre(u) + " → " + nombre(v) + " no existe.";
  delete g.ady[u][v];
  return null;
}

/* Genera un grafo dirigido y sin ciclos de n vertices.

   Idea: sorteamos un orden de los vertices y SOLO creamos aristas que van de un
   vertice a otro que esta mas adelante en ese orden. Como todas las flechas
   apuntan "hacia adelante", es imposible volver al punto de partida, asi que no
   hay ciclos y no hace falta revisarlos uno por uno.

   Despues, para que el grafo no quede partido en pedazos, le damos a cada
   vertice (menos al primero) al menos una flecha que entra desde alguno anterior. */
function generarAleatorio(n, densidad, pesoMin, pesoMax) {
  // La densidad baja cuando n crece. Si se deja fija, con n = 16 salen mas de
  // cincuenta aristas y el dibujo se vuelve ilegible por mucho que lo ordenemos.
  densidad = densidad || Math.min(0.38, 2.4 / n);
  pesoMin = pesoMin || 1;
  pesoMax = pesoMax || 9;

  const g = crearGrafo(n);

  // orden oculto, barajado con Fisher-Yates
  const orden = [];
  for (let i = 0; i < n; i++) orden.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = orden[i]; orden[i] = orden[j]; orden[j] = tmp;
  }

  const pesoAlAzar = function () {
    return pesoMin + Math.floor(Math.random() * (pesoMax - pesoMin + 1));
  };

  // cada vertice recibe al menos una arista entrante desde uno anterior
  for (let pos = 1; pos < n; pos++) {
    const v = orden[pos];
    const u = orden[Math.floor(Math.random() * pos)];
    g.ady[u][v] = pesoAlAzar();
  }

  // aristas extra, siempre hacia adelante en el orden
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const u = orden[i], v = orden[j];
      if (!(v in g.ady[u]) && Math.random() < densidad) {
        g.ady[u][v] = pesoAlAzar();
      }
    }
  }
  return g;
}

/* Ejemplo de la Lectura 5 del curso, orientado como grafo dirigido aciclico.
   Lo dejamos cargable con un boton porque tiene DOS caminos minimos de A a H
   (A-C-D-F-H y A-C-D-E-H, ambos de longitud 8), que es justo el caso que el
   material de clase usa para explicar que puede haber mas de una solucion. */
function grafoDeLaLectura() {
  const g = crearGrafo(8);                   // A..H
  const aristas = [
    ["A", "B", 3], ["A", "C", 1], ["C", "D", 2], ["C", "F", 5],
    ["B", "D", 2], ["B", "G", 5], ["D", "E", 4], ["D", "F", 2],
    ["E", "G", 1], ["E", "H", 1], ["F", "H", 3]
  ];
  for (const a of aristas) {
    g.ady[indice(a[0])][indice(a[1])] = a[2];
  }
  return g;
}

// Matriz de adyacencia. Usamos null donde no hay arista para poder mostrar "-".
function matrizAdyacencia(g) {
  const m = [];
  for (let i = 0; i < g.n; i++) {
    const fila = [];
    for (let j = 0; j < g.n; j++) fila.push(j in g.ady[i] ? g.ady[i][j] : null);
    m.push(fila);
  }
  return m;
}

// Que vertices se pueden alcanzar desde el origen. Sirve para no ofrecerle al
// usuario destinos a los que nunca va a poder llegar.
function alcanzablesDesde(g, origen) {
  const alcanzables = [];
  for (let v = 0; v < g.n; v++) {
    if (v !== origen && hayCamino(g, origen, v)) alcanzables.push(v);
  }
  return alcanzables;
}


/* ----------------------------------------------------------------------------
   2. Dijkstra paso a paso

   Seguimos los pasos tal como los presenta la Lectura 5:

     Paso 1. Etiquetar el origen con [0, -]0.
     Paso 2. Etiquetar los vertices adyacentes al vertice actual.
     Paso 3. Elegir el no visitado con menor acumulado y marcarlo visitado.
     Paso 4. Actualizar las etiquetas de sus adyacentes no visitados.
     Paso 5. Si la distancia nueva es menor se reemplaza; si es mayor o igual
             se conserva la que ya estaba.
     Paso 6. Repetir desde el paso 3 hasta visitar TODOS los vertices.
     Paso 7. Reconstruir la ruta siguiendo los vertices de procedencia.

   Ojo con el paso 6: no cortamos al llegar al destino. La lectura dice
   explicitamente que hay que etiquetar todos los vertices, y asi la tabla
   queda completa como en clase.

   Devolvemos una lista de "pasos". Cada paso es una foto del estado en ese
   momento, para poder ir y venir con los botones sin recalcular nada.
   ---------------------------------------------------------------------------- */

function dijkstraPasos(g, origen, destino) {
  const n = g.n;

  // etiquetas[v] = { d: acumulado, pred: indice o null, iter: numero } o null
  const etiquetas = [];
  const visitados = [];
  for (let i = 0; i < n; i++) { etiquetas.push(null); visitados.push(false); }
  etiquetas[origen] = { d: 0, pred: null, iter: 0 };

  const pasos = [];

  // guarda una copia del estado actual
  function foto(titulo, detalle, actual, relajadas, empates) {
    pasos.push({
      titulo: titulo,
      detalle: detalle,
      etiquetas: etiquetas.map(function (e) { return e === null ? null : { d: e.d, pred: e.pred, iter: e.iter }; }),
      visitados: visitados.slice(),
      actual: (actual === undefined ? null : actual),
      relajadas: relajadas || [],
      empates: empates || [],
      final: false,
      camino: []
    });
  }

  foto(
    "Paso 1. Vértice origen",
    ["Se etiqueta el origen " + nombre(origen) + " con [0, -]0.",
     "Los demás vértices todavía no tienen etiqueta.",
     "Ningún vértice ha sido visitado."],
    origen
  );

  let iteracion = 0;

  while (true) {
    // Paso 3: el no visitado con menor acumulado
    let u = null, mejor = INF;
    for (let i = 0; i < n; i++) {
      if (!visitados[i] && etiquetas[i] !== null && etiquetas[i].d < mejor) {
        mejor = etiquetas[i].d;
        u = i;
      }
    }

    if (u === null) break;   // no queda nadie alcanzable sin visitar

    iteracion++;
    visitados[u] = true;

    const detalle = [
      "Se elige " + nombre(u) + ": es el vértice no visitado con menor acumulado (d = " + mejor + ").",
      nombre(u) + " pasa a visitados, su etiqueta ya es definitiva."
    ];
    const relajadas = [];
    const empates = [];

    // Paso 4 y 5: miramos los adyacentes no visitados
    const vecinos = Object.keys(g.ady[u]).map(Number).sort(function (a, b) { return a - b; });

    if (vecinos.length === 0) {
      detalle.push(nombre(u) + " no tiene aristas salientes, no hay nada que actualizar.");
    }

    for (const v of vecinos) {
      const peso = g.ady[u][v];
      const nueva = etiquetas[u].d + peso;

      if (visitados[v]) {
        detalle.push("  " + nombre(u) + " → " + nombre(v) + " (peso " + peso + "): " + nombre(v) + " ya está visitado, se ignora.");
        continue;
      }

      if (etiquetas[v] === null) {
        etiquetas[v] = { d: nueva, pred: u, iter: iteracion };
        detalle.push("  " + nombre(u) + " → " + nombre(v) + ": " + etiquetas[u].d + " + " + peso + " = " + nueva +
                     "  →  " + nombre(v) + " recibe la etiqueta [" + nueva + ", " + nombre(u) + "]" + iteracion);
        relajadas.push([u, v, true]);
      } else if (nueva < etiquetas[v].d) {
        const antes = etiquetas[v].d;
        etiquetas[v] = { d: nueva, pred: u, iter: iteracion };
        detalle.push("  " + nombre(u) + " → " + nombre(v) + ": " + etiquetas[u].d + " + " + peso + " = " + nueva +
                     " < " + antes + "  →  se reemplaza por [" + nueva + ", " + nombre(u) + "]" + iteracion);
        relajadas.push([u, v, true]);
      } else if (nueva === etiquetas[v].d) {
        // Empate. La lectura dice conservar la etiqueta que ya estaba, pero el
        // empate significa que hay otro camino de la misma longitud minima.
        detalle.push("  " + nombre(u) + " → " + nombre(v) + ": " + etiquetas[u].d + " + " + peso + " = " + nueva +
                     " = " + etiquetas[v].d + "  →  empate. Se conserva la etiqueta actual, pero esto indica otro camino mínimo hacia " + nombre(v) + ".");
        empates.push([u, v]);
        relajadas.push([u, v, false]);
      } else {
        detalle.push("  " + nombre(u) + " → " + nombre(v) + ": " + etiquetas[u].d + " + " + peso + " = " + nueva +
                     " ≥ " + etiquetas[v].d + "  →  no mejora, se conserva la etiqueta actual.");
        relajadas.push([u, v, false]);
      }
    }

    foto("Iteración " + iteracion + ": vértice " + nombre(u), detalle, u, relajadas, empates);
  }

  // Paso 7: reconstruimos la ruta hacia el destino siguiendo los predecesores
  const resumen = [];
  let camino = [];

  if (etiquetas[destino] !== null) {
    let x = destino;
    while (x !== null) {
      camino.push(x);
      x = etiquetas[x].pred;
    }
    camino.reverse();

    resumen.push("Distancia mínima de " + nombre(origen) + " a " + nombre(destino) + ": " + etiquetas[destino].d + ".");
    resumen.push("Camino: " + camino.map(nombre).join(" → "));
    resumen.push("Se obtiene siguiendo los vértices de procedencia desde " + nombre(destino) + " hasta " + nombre(origen) + " y leyendo la secuencia al revés.");

    const sinEtiqueta = [];
    for (let i = 0; i < n; i++) if (etiquetas[i] === null) sinEtiqueta.push(nombre(i));
    if (sinEtiqueta.length > 0) {
      resumen.push("Vértices no alcanzables desde " + nombre(origen) + ": " + sinEtiqueta.join(", ") + ".");
    }
  } else {
    resumen.push("No existe ningún camino dirigido de " + nombre(origen) + " a " + nombre(destino) + ".");
    resumen.push("El algoritmo etiquetó todos los vértices que sí son alcanzables desde " + nombre(origen) + ".");
  }

  pasos.push({
    titulo: "Resultado",
    detalle: resumen,
    etiquetas: etiquetas.map(function (e) { return e === null ? null : { d: e.d, pred: e.pred, iter: e.iter }; }),
    visitados: visitados.slice(),
    actual: destino,
    relajadas: [],
    empates: [],
    final: true,
    camino: camino
  });

  return pasos;
}


/* Dijkstra "a secas", sin guardar pasos. Lo usamos solo para elegir por defecto
   un origen y un destino que hagan una demostración interesante, no para
   resolver el problema (eso lo hace dijkstraPasos). */
function distanciasDesde(g, origen) {
  const d = new Array(g.n).fill(INF);
  const vis = new Array(g.n).fill(false);
  d[origen] = 0;
  while (true) {
    let u = null, mejor = INF;
    for (let i = 0; i < g.n; i++) if (!vis[i] && d[i] < mejor) { mejor = d[i]; u = i; }
    if (u === null) break;
    vis[u] = true;
    for (const v in g.ady[u]) {
      const w = Number(v);
      if (d[u] + g.ady[u][v] < d[w]) d[w] = d[u] + g.ady[u][v];
    }
  }
  return d;
}

/* El grafo aleatorio es acíclico, así que muchos pares origen-destino no tienen
   camino: los vértices que quedan al final del orden no pueden volver atrás.
   Para que la aplicación arranque mostrando algo útil, elegimos como origen el
   vértice desde el cual se alcanzan más vértices, y como destino el más lejano
   de ellos. El usuario puede cambiar ambos cuando quiera. */
function mejorParOrigenDestino(g) {
  let mejorOrigen = 0, masAlcanzados = -1, mejorDestino = null;

  for (let o = 0; o < g.n; o++) {
    const d = distanciasDesde(g, o);
    let cuantos = 0, lejano = null, mayor = -1;
    for (let v = 0; v < g.n; v++) {
      if (v !== o && d[v] < INF) {
        cuantos++;
        if (d[v] > mayor) { mayor = d[v]; lejano = v; }
      }
    }
    if (cuantos > masAlcanzados) { masAlcanzados = cuantos; mejorOrigen = o; mejorDestino = lejano; }
  }
  return { origen: mejorOrigen, destino: mejorDestino === null ? (mejorOrigen + 1) % g.n : mejorDestino };
}
