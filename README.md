# Camino minimo - Algoritmo de Dijkstra

Trabajo del curso de Matematica Computacional (1AMA0726) de la UPC.
Seccion SW15401, Grupo 3.

Pagina publicada: https://doubletap74.github.io/camino-minimo-dijkstra/

## Que hace

Una pagina web para resolver el problema del camino minimo con el algoritmo
de Dijkstra, paso a paso y sobre un grafo dibujado.

- Se pide el numero de vertices n, entre 7 y 16.
- El grafo se puede generar al azar o armar a mano con el raton.
- Siempre es dirigido y sin ciclos.
- Se elige un vertice de origen y uno de destino.
- El algoritmo avanza iteracion por iteracion, con las etiquetas [d, V]^n.
- Al final da la distancia minima, cuantos caminos minimos hay y la
  secuencia de cada uno, y los resalta todos sobre el grafo.

Hay un boton que carga el ejemplo resuelto de la Lectura 5 del curso, que
tiene dos caminos minimos.

## Como se usa

Entrar al enlace de arriba, o bajar los archivos y abrir index.html con
doble clic. No hay que instalar nada.

## Archivos

| Archivo | Que tiene |
|---|---|
| index.html | la pagina y los tres paneles |
| estilos.css | colores, tablas y disposicion |
| algoritmo.js | el grafo, la generacion y el algoritmo de Dijkstra |
| interfaz.js | el dibujo en el canvas, las tablas y los botones |
| verificacion.html | comprueba que el resultado sea correcto |
| bateria.js | las comprobaciones que ejecuta esa pagina |

No se usa ninguna libreria externa. Solo HTML, CSS y JavaScript.

## Comprobar que esta bien

Abrir verificacion.html y pulsar el boton. Genera 3000 grafos, les corre el
algoritmo y compara el resultado contra dos metodos distintos: otra forma de
calcular el camino minimo y una enumeracion que recorre todos los caminos uno
por uno. Tarda un par de segundos y dice cuantas diferencias encontro.

## Integrantes

- Fernandez Salas, Eduar
- Galvez Molero, Octavio Jesus
- Jimenez Suarez, Wilmer Edwin
- Lopez Pena, Leonardo Natanael
- Maldonado Galloso, Sebastian Jhulino
