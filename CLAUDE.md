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

- Plantas: 0 superficie, 1 y 2 subsuelo (`isUnderground`), 3 plantas altas de las casas (`UPPER_Z`). En la planta alta, donde no hay suelo (`G.VOID`) se dibuja la superficie oscurecida. Las escaleras de casa son `^` (planta baja) y `v` (planta alta) en la misma casilla.
- Albor (`data/albor.ts`) se construye por piezas: casas de 9 × 7 con planta baja y alta; las del sur se usan volteadas.
- Las puertas cerradas (`O.DOOR`) y el portón (`O.GATE`) son transitables a nivel de mapa (para la conectividad), pero `Game.free()` las bloquea: las puertas a todos hasta que se abren (`toggleDoor`) y el portón a todos salvo al jugador con la misión `ductos` terminada. El estado de las puertas vive en `map.obj` y no se guarda.
- Los tejados (`map.roof`) cubren los suelos interiores (madera o baldosas) dentro de los pueblos y los muros que los rodean. No pongas madera (`_`, `h`, `o`...) en calles o plazas, o les saldrá tejado.
- Las fronteras entre regiones (`ridge` en `genTerrain`) son crestas de roca o bosque cerrado: el mapa se recorre por caminos y pasos.
- Reaparición: 3 min en superficie, 4 min en cuevas, 20 min los jefes. Prefiere mazmorras con muchas salas (`rooms`) y pocas criaturas.

- Las plantillas de pueblo deben tener todas las filas del mismo ancho; los dígitos son NPC (ver `npcs` del pueblo), `@` es el punto de reaparición del templo y `D` la escalera a la cueva del pueblo.
- Los objetos que bloquean el paso en las cuevas solo se colocan junto a paredes de sala (`wallNear` en `decorateCave`), para no cortar pasillos.
- Las criaturas no entran en zonas protegidas (`pz`) ni pisan escaleras, y no aparecen a la vista del jugador.
- Si cambias el precio de venta de un objeto, comprueba que ningún NPC lo compre más caro (`npm run sim` lo detecta).

## Comprobaciones

- `npm run check` (tipos) y `npm run sim` después de cambiar lógica, mundo, contenido o balance. `sim` comprueba la conectividad del mapa, los datos, los diálogos y las misiones, y hace combates con piloto automático por tramos de nivel, incluidos los dos jefes.
- En desarrollo, `window.__game` expone la partida (por ejemplo `__game.teleport(__game.player, x, y, z)`).
- `npm run deploy` publica en GitHub Pages (rama `gh-pages`).
