# Crónicas de Brumaria — guía para asistentes de IA

RPG de un jugador en tiempo real sobre casillas, con un mundo abierto de pueblos, NPC con diálogo por palabras clave, cuevas por plantas, vocaciones, hechizos por palabras y botín. El usuario escribe en español: el texto del juego, los comentarios y los documentos van en español.

Toma mecánicas del género (casillas, ataque automático cada 2 s, palabras clave con NPC, hechizos por conjuro, capacidad, hambre), pero el mundo, los nombres, las criaturas y el arte son originales. No copies nombres, lugares, criaturas ni gráficos de juegos existentes.

## Arquitectura

- `src/data/*` es contenido puro (casillas, objetos, criaturas, NPC, misiones, hechizos, vocaciones, geografía). Añade contenido aquí antes de tocar la lógica.
- `src/game/world.ts` genera el mundo con semilla fija (`WORLD_SEED`): terreno, río, pueblos estampados desde plantillas ASCII (`data/world.ts`), caminos con A*, cuevas por autómata celular o por salas, y zonas de criaturas. Termina abriendo paso hasta cualquier sitio importante que haya quedado aislado.
- `src/game/game.ts` es la simulación en tiempo real (`update(dt)`): movimiento, combate, IA, objetos, comercio y guardado. `src/game/dialog.ts` lleva las conversaciones. Ninguno de los dos importa el DOM ni el canvas, porque `scripts/sim.ts` los ejecuta en Node. Se comunican con la interfaz mediante `game.events` (`GameEvent` en `game/types.ts`).
- `src/gfx/art.ts` tiene el arte a resolución completa (32 × 32 por casilla) en perspectiva oblicua: la altura de muros, montañas, roca de cueva y árboles se proyecta hacia arriba a la izquierda (bloques de 48 × 48 o más, anclados abajo a la derecha), los suelos se derraman sobre sus vecinos según `GROUND_PRIO`, y `finish()` añade contorno oscuro y luz desde arriba a la izquierda. `src/gfx/sprites.ts` reúne y cachea los sprites (los objetos pequeños, criaturas no humanoides e iconos siguen en 16 × 16 lógicos). Todo el arte es original: no uses ni calques gráficos de otros juegos. `src/gfx/render.ts` dibuja la vista de 15 × 11 casillas, la luz, los efectos y el minimapa.
- `src/ui/*` es DOM puro: panel lateral, barra de atajos, consola, ventanas y sonido.
- `src/main.ts` une todo: pantalla de título, bucle, teclado y ratón, guardado en `localStorage` (`brumaria-save-v1`).

## Reglas

- Las plantillas de pueblo deben tener todas las filas del mismo ancho; los dígitos son NPC (ver `npcs` del pueblo), `@` es el punto de reaparición del templo y `D` la escalera a la cueva del pueblo.
- Los objetos que bloquean el paso en las cuevas solo se colocan junto a paredes de sala (`wallNear` en `decorateCave`), para no cortar pasillos.
- Las criaturas no entran en zonas protegidas (`pz`) ni pisan escaleras, y no aparecen a la vista del jugador.
- Si cambias el precio de venta de un objeto, comprueba que ningún NPC lo compre más caro (`npm run sim` lo detecta).

## Comprobaciones

- `npm run check` (tipos) y `npm run sim` después de cambiar lógica, mundo, contenido o balance. `sim` comprueba la conectividad del mapa, los datos, los diálogos y las misiones, y hace combates con piloto automático por tramos de nivel, incluidos los dos jefes.
- En desarrollo, `window.__game` expone la partida (por ejemplo `__game.teleport(__game.player, x, y, z)`).
- `npm run deploy` publica en GitHub Pages (rama `gh-pages`).
