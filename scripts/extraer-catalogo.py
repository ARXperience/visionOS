"""Extrae el catalogo de servicios desde el sitio publico de Vision Colombia.

    python scripts/extraer-catalogo.py

Lee `tools/build.py` (constante HUBS) y `content.json` del sitio estatico y
escribe `apps/api/prisma/data/servicios.json`.

Es de un solo uso y NO es autoritativo. El sitio web tiene el nombre, el slug
y la linea de negocio de cada servicio; NO tiene cuanto dura, que equipo usa
ni quien lo presta. Esos campos salen de aqui como conjetura y quedan
listados en `revisar` de cada servicio: la clinica los corrige antes de que
el seed entre a produccion. Agendar con una duracion inventada es peor que
no agendar.
"""
import json
import re
import sys
from pathlib import Path

SITIO = Path(r"C:\Users\centr\Desktop\claude code\visioncolombia")
DESTINO = Path(__file__).resolve().parent.parent / "apps" / "api" / "prisma" / "data"

sys.path.insert(0, str(SITIO / "tools"))
try:
    import build  # noqa: E402
except ModuleNotFoundError:
    sys.exit(f"No se encontro el generador del sitio en {SITIO}")

# Linea de negocio por hub de origen (primer elemento de cada tupla de HUBS).
LINEA = {
    "consultas": "CONSULTA",
    "examenes-diagnosticos": "EXAMEN",
    "cirugias": "CIRUGIA",
    "optica-3": "OPTICA",
    "campanas-de-salud-visuales-para-empresas": "EMPRESAS",
    "medicina-estetica-facial": "ESTETICA",
}

# Conjetura por linea. Ninguna sale de la clinica: todas van marcadas.
DURACION_CONJETURADA = {
    "CONSULTA": 30,
    "EXAMEN": 20,
    "CIRUGIA": 60,
    "OPTICA": 30,
    "EMPRESAS": 60,
    "ESTETICA": 45,
}

# Equipo requerido cuando el nombre del servicio lo dice sin ambiguedad.
# Lo que no aparece aqui se deja en null: adivinar el equipo de un examen
# es como adivinar su duracion.
MODALIDAD = {
    "tomografia-optica-coherente": "OCT",
    "angiografia-fluoresceinica": "ANGIOGRAFO",
    "campo-visual-computarizado": "CAMPIMETRO",
    "topografia-corneal-y-paquimetria-pentacam": "PENTACAM",
    "ecografia-ocular-ultrasonica": "ECOGRAFO",
    "ultrabiomicroscopia-ultrasonica-ubm": "UBM",
    "biometria-optica": "BIOMETRO",
    "interferometria": "INTERFEROMETRO",
    "paquimetria-ultrasonica": "PAQUIMETRO",
    "recuento-endotelial": "MICROSCOPIO_ESPECULAR",
    "pupilometria": "PUPILOMETRO",
    "electroretinograma": "ELECTROFISIOLOGIA",
    "electrooculograma": "ELECTROFISIOLOGIA",
    "potenciales-visuales-evocados": "ELECTROFISIOLOGIA",
}

SALA = {"CIRUGIA": "QUIROFANO", "EXAMEN": "SALA_DIAGNOSTICO", "OPTICA": "OPTICA"}

PREFIJO = {"CONSULTA": "CON", "EXAMEN": "EXA", "CIRUGIA": "CIR",
           "OPTICA": "OPT", "EMPRESAS": "EMP", "ESTETICA": "EST"}

# Palabras que no distinguen un servicio de otro y solo alargan el codigo.
VACIAS = {"de", "del", "la", "el", "y", "o", "en", "con", "por", "para", "los",
          "las", "un", "una", "al", "consulta", "especializada", "test"}


def codigo(linea: str, slug: str, usados: set) -> str:
    """CON-OG, EXA-TOC... Iniciales de las palabras que si distinguen.

    Truncar el slug producia colisiones (las fichas de rehabilitacion
    comparten los primeros 32 caracteres). El codigo es provisional: la
    clinica lo cambia por el suyo, pero mientras tanto tiene que ser unico.
    """
    palabras = [p for p in slug.split("-") if p not in VACIAS and len(p) > 1]
    base = f"{PREFIJO[linea]}-" + "".join(p[0] for p in palabras[:4]).upper()
    code, n = base, 1
    while code in usados:
        n += 1
        code = f"{base}{n}"
    usados.add(code)
    return code


def texto_de(src_slug: str) -> str:
    lead, cuerpo = build.lead_and_body(src_slug)
    return " ".join([lead] + [t for _, t in cuerpo]).lower()


def extraer():
    servicios = []
    usados = set()

    for src_hub, _archivo, _label, _icono, hijos in build.HUBS:
        linea = LINEA[src_hub]

        # Los hubs sin fichas (optica, empresas, estetica) son un servicio
        # en si mismos; los que tienen fichas aportan sus hijos.
        origenes = hijos if hijos else [src_hub]

        for src in origenes:
            slug = build.slugify(build.OUT_OF[src].replace(".html", ""))
            texto = texto_de(src)
            revisar = ["durationMin", "code"]

            modalidad = MODALIDAD.get(slug)
            if linea == "EXAMEN" and not modalidad:
                revisar.append("requiredModality")

            # Heuristica declarada: si el texto menciona dilatacion, el
            # recordatorio debe avisar que no conduzca de regreso. Falso
            # negativo probable, por eso va a revision igual.
            dilata = bool(re.search(r"dilata|midriasis|midriatic", texto))
            revisar.append("requiresDilation")

            servicios.append({
                "code": codigo(linea, slug, usados),
                "name": build.title_of(src),
                "slug": slug,
                "businessLine": linea,
                "durationMin": DURACION_CONJETURADA[linea],
                "bufferMin": 10 if linea == "CIRUGIA" else 0,
                "requiresProfessional": True,
                "requiresRoom": True,
                "requiredRoomKind": SALA.get(linea, "CONSULTORIO"),
                "requiredModality": modalidad,
                "requiresDilation": dilata,
                "requiresReferral": linea in ("EXAMEN", "CIRUGIA"),
                "requiresAuthorization": linea == "CIRUGIA",
                "producesResultFile": linea == "EXAMEN",
                "preparationNotes": None,
                "revisar": sorted(set(revisar)),
            })

    return servicios


def main() -> None:
    servicios = extraer()
    DESTINO.mkdir(parents=True, exist_ok=True)
    salida = DESTINO / "servicios.json"
    salida.write_text(
        json.dumps(servicios, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    por_linea = {}
    for s in servicios:
        por_linea[s["businessLine"]] = por_linea.get(s["businessLine"], 0) + 1

    print(f"{len(servicios)} servicios -> {salida}")
    for linea, n in sorted(por_linea.items()):
        print(f"  {linea:<10} {n}")
    print(
        f"\nTodos traen campos conjeturados en `revisar`. La clinica los corrige\n"
        f"antes de que esto llegue a produccion."
    )


if __name__ == "__main__":
    main()
