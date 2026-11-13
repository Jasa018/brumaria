# Crónicas de Brumaria

RPG de un jugador en tiempo real sobre casillas, inspirado en los MMORPG clásicos de vista cenital. Se juega en el navegador, sin instalar nada.

**Jugar:** https://jasa018.github.io/brumaria/

## Qué hay

- **Mundo de 240 × 170 casillas en 3 plantas**: la isla de Albor (inicio), las Llanuras de Valcorona, el Bosque Umbrío, los Montes Ferrosos y el Pantano de Nieblaseca, más 8 cuevas y mazmorras.
- **5 pueblos**: Albor, Puerto Sauce, la capital Valcorona, la ciudad enana de Hondaforja y el pueblo palafito de Juncal. Los pueblos son zonas protegidas.
- **27 NPC con diálogo por palabras clave** (`hola`, `misión`, `comerciar`, `viajar`, `hechizos`, `curar`, `hogar`...): tenderos, sacerdotes, maestros de hechizos, barqueros y cocheros.
- **27 criaturas** con IA (perseguir, huir, mantener distancia, ataques a distancia y de área, curarse, invocar) y **2 jefes**: Morvaine el Nigromante e Ignaroth, el Wyrm de Ceniza.
- **11 misiones** encadenadas hasta el final del juego.
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
