# Posti Nostri

Prototipo funcional de una colección privada de lugares visitados por Juan y Rosi.

## Abrir

Abre `index.html` en un navegador moderno. No necesita instalación.

## Incluye

- Diseño responsive inspirado en Airbnb/Instagram.
- Restaurantes, hoteles, heladerías, cafeterías, bares, naturaleza, experiencias y otros.
- Valoraciones separadas de Juan y Rosi.
- Estrellas enteras del 1 al 5 y nota breve por criterio.
- Nota conjunta automática, incluyendo el precio invertido.
- Ranking general, por calidad-precio, precio, factor especial y criterios específicos.
- Hasta tres fotos por lugar, con compresión automática.
- Filtros, buscador, ficha detallada y campo “¿Volveríamos?”.
- Persistencia local mediante `localStorage`.

## Siguiente paso: Supabase

La interfaz está desacoplada de la persistencia. Para pasar a Supabase se sustituirían `loadPlaces()` y `savePlaces()` por consultas a las tablas y la subida Base64 por Supabase Storage.

Estructura recomendada:

- `profiles`
- `places`
- `ratings`
- `place_photos`

Las fotos deberían guardarse en un bucket `place-photos`, con políticas RLS limitadas a Juan y Rosi.
