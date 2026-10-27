# Medios del sitio

Dos bucles de video de fondo, generados con la paleta de la marca. No son
material de archivo de una clínica cualquiera: son **movimiento abstracto**,
que es lo honesto mientras no haya fotografía y video propios.

| Archivo | Dónde se usa | Peso |
|---|---|---|
| `hero.mp4` + `hero.jpg` | Portada de todas las páginas | ~470 KB |
| `luz.mp4` + `luz.jpg` | Bloques de sección (diagnóstico, cirugía) | ~640 KB |

El `.jpg` es el póster: lo que se ve mientras el video carga y lo que queda
en conexiones lentas. El `<video>` va con `muted`, `playsinline` y `loop`, y
`sitio.js` lo pausa cuando sale de pantalla.

## Cómo se generaron

Cada uno es un degradado en movimiento de nueve segundos, unido con su propia
reversa: así el bucle cierra sin salto visible. Para regenerarlos —o cambiar
los colores— hace falta ffmpeg:

```bash
# 1. Nueve segundos de degradado en movimiento
ffmpeg -y -f lavfi -i "gradients=s=1600x900:c0=0x03080F:c1=0x071A36:c2=0x0A2452:c3=0x1554A8:c4=0x0E93B4:nb_colors=5:seed=17:speed=0.006:x0=140:y0=780:x1=1480:y1=110:duration=9:rate=25" \
  -t 9 -vf "gblur=sigma=22,noise=alls=3:allf=t+u,vignette=PI/4.5" \
  -c:v libx264 -pix_fmt yuv420p -crf 31 -preset slow -an base.mp4

# 2. El clip + el clip al revés = bucle sin corte
ffmpeg -y -i base.mp4 -filter_complex "[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]" \
  -map "[v]" -c:v libx264 -pix_fmt yuv420p -crf 31 -preset slow -movflags +faststart -an hero.mp4

# 3. Póster
ffmpeg -y -ss 4 -i hero.mp4 -frames:v 1 -q:v 4 hero.jpg && rm base.mp4
```

Para `luz.mp4` es lo mismo cambiando los colores por
`c0=0x0A2452:c1=0x1554A8:c2=0x0E93B4:c3=0x8BE3F5:c4=0xDFF3FA`, `seed=29`,
`speed=0.009` y sin la viñeta.

## Cuando llegue fotografía real

Sustituir el archivo con el mismo nombre y ya está: el HTML no cambia. Para
video real de la clínica, mantener el peso por debajo de ~1,5 MB y recortar a
16:9; lo que se ve detrás del texto es la mitad izquierda de la imagen.

Las tarjetas que hoy muestran un degradado (`.foto` en `estilo.css`) aceptan
una foto sin tocar el HTML: el CSS pinta `url(...)` sobre el degradado, así
que si el archivo falta se ve la marca y no un hueco roto.
