# Problema del camino mínimo — Algoritmo de Dijkstra

Proyecto del curso **1AMA0726 Matemática Computacional** — Universidad Peruana de
Ciencias Aplicadas. Caso 2: problema del camino mínimo.

**Aplicación en línea:** https://doubletap74.github.io/camino-minimo-dijkstra/

## Qué hace

Aplicación web interactiva que permite construir un grafo dirigido y sin ciclos de
*n* vértices (7 ≤ *n* ≤ 16), de forma manual o aleatoria, y ejecutar sobre él el
algoritmo de Dijkstra paso a paso.

- Validación de *n* en el rango 7 a 16.
- Generación aleatoria mediante un orden topológico oculto, que garantiza la ausencia
  de ciclos por construcción.
- Generación manual con verificación de lazos, pesos no positivos, aristas repetidas y
  aristas que cerrarían un ciclo.
- Matriz de adyacencia y representación gráfica etiquetada.
- Ejecución paso a paso con la notación de etiquetas `[d, V]ⁿ` del curso, etiquetando
  todos los vértices.
- Distancia mínima y camino resaltado sobre el grafo.
- Botón para cargar el ejemplo resuelto de la Lectura 5 del curso.

## Tecnologías

HTML5, CSS3, JavaScript y la Canvas API. **Sin librerías externas:** todo el código es
del grupo, incluido el algoritmo y el dibujo del grafo.

## Archivos

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la página y de los paneles |
| `estilos.css` | Presentación: colores, tablas y disposición |
| `algoritmo.js` | Grafo, generación del DAG y algoritmo de Dijkstra |
| `interfaz.js` | Dibujo en el canvas, tablas y eventos de los botones |

## Ejecución local

No requiere instalar nada: basta con abrir `index.html` en cualquier navegador.
