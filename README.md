# Posti Nostri

Aplicación privada para guardar y valorar los lugares visitados por Juan y Rosi.

## Supabase

La app está conectada al proyecto Supabase de Posti Nostri mediante la URL y la clave pública. Usa:

- Authentication: correo y contraseña
- Tables: `profiles`, `places`, `ratings`, `place_photos`
- Storage bucket privado: `place-photos`

## Publicación

Publica los archivos `index.html`, `styles.css` y `app.js` en la raíz del proyecto de Vercel.

## Seguridad

La clave incluida es la clave pública `sb_publishable_...`. No añadas nunca una clave `service_role` o `sb_secret_` al frontend.
