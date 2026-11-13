# Crónicas de Brumaria

RPG de un jugador en tiempo real sobre casillas, inspirado en los MMORPG clásicos de vista cenital. Se juega en el navegador, sin instalar nada.

**Jugar:** https://jasa018.github.io/brumaria/

## Qué hay

- **Mundo de 260 × 180 casillas en 4 plantas** (superficie, dos subsuelos y las plantas altas de las casas): los Campos de Albor, las Llanuras de Valcorona, el Bosque Umbrío, los Montes Ferrosos y el Pantano de Nieblaseca, separados por cordilleras y bosques cerrados que se cruzan por caminos y pasos. Hay 10 cuevas y mazmorras con muchas salas.
- **Inicio en una ciudad cerrada**: Albor está amurallada y los guardias no te dejan salir hasta que limpias **Los Ductos**, el calabozo bajo la ciudad, y derrotas al Rey de las Ratas. Tiene 8 casas amuebladas con segunda planta, tejados que desaparecen al entrar y puertas que se abren y cierran con un clic.
- **Casas propias**: el alcalde Teodoro (Albor) y el escribano Ciro (Juncal) venden casas. Su puerta solo se abre para el dueño y su baúl guarda objetos compartidos entre todas tus casas. Albor tiene además una taberna, La Rata Borracha, con tabernero y bardo.
- **4 pueblos más**: la capital Valcorona, la ciudad enana de Hondaforja y el pueblo palafito de Juncal. Los pueblos son zonas protegidas.
- **30 NPC con diálogo por palabras clave** (`hola`, `misión`, `comerciar`, `viajar`, `hechizos`, `curar`, `hogar`, `casas`...) y **charla cotidiana**: responden a «¿cómo estás?», «¿dónde está el herrero?», «¿quién es Teodoro?», «¿dónde compro pan?», la hora, el tiempo, rumores, chistes y agradecimientos.
- **30 criaturas** con IA (perseguir, huir, mantener distancia, ataques a distancia y de área, curarse, invocar) y **3 jefes**: el Rey de las Ratas, Morvaine el Nigromante e Ignaroth, el Wyrm de Ceniza.
- **12 misiones** encadenadas hasta el final del juego.
- **4 vocaciones** (Guerrero, Arquero, Brujo, Chamán) que se eligen al nivel 6 con el Oráculo, y **18 hechizos** que se lanzan escribiendo sus palabras mágicas o con la barra de atajos.
- **Habilidades que suben con el uso** (cuerpo a cuerpo, distancia, escudo, nivel mágico), experiencia y niveles, capacidad de carga, hambre, botín en cadáveres, equipo en 8 ranuras, munición, varitas que gastan maná.
- **Día y noche**, cuevas oscuras (antorchas y el hechizo *lumen*), minimapa y mapa del mundo explorado.
- Guardado automático en el navegador. Si mueres, despiertas en el templo de tu hogar y pierdes algo de experiencia.

## Controles

| Acción | Tecla |
| --- | --- |
| Moverse | Flechas o WASD (diagonales: Q E Z C), o clic en el suelo |
| Atacar | Clic en la criatura, o Espacio para el enemigo más cercano |
| Dejar de atacar / cerrar ventanas | Esc |
| Hablar | Clic en el NPC, o Enter y escribir (`hola`, `misión`...) |
| Hechizos y objetos | 1-8 (barra de atajos) |
| Coger botín | Clic en el cadáver, o F para todo lo de alrededor |
| Abrir o cerrar una puerta | Clic en la puerta estando a su lado (o caminar hacia ella) |
| Mirar | Clic derecho |
| Ventanas | K personaje · J misiones · L hechizos · M mapa · H ayuda |

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run check    # tipos
npm run sim      # prueba el mundo, los diálogos, las misiones y el balance sin interfaz
npm run build    # versión de producción en dist/
npm run deploy   # publica dist/ en la rama gh-pages
```

TypeScript + Vite + Canvas 2D, sin dependencias en tiempo de ejecución. Todo el arte y el sonido se generan por código.
