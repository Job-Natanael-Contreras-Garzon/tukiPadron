import re
import json
import os
import pymupdf

PDF_PATH = r"C:\Users\contr\.gemini\antigravity\brain\e832cb3c-cc49-4e68-a513-3e8c0252e8eb\.user_uploaded\media_1791223759774.pdf"

# Lista oficial de Jurados Electorales con su mesa asignada
JURADOS_MAP = {
    "226207064": {"mesa": 183, "nombre": "AGUILAR PANIAGUA MELANIE DANAE"},
    "214130551": {"mesa": 183, "nombre": "ANTELO CAMPOS RODRIGO SEBASTIAN"},
    "216156823": {"mesa": 183, "nombre": "BALDERRAMA RONCALES NADHIR INES"},
    "226068609": {"mesa": 184, "nombre": "CAMPOS BALLESTEROS IVAN"},
    "225150301": {"mesa": 184, "nombre": "CAYO ESCALERA MARIA STHEFANY"},
    "220026300": {"mesa": 184, "nombre": "CHUMACERO COPA MARY LUZ"},
    "224097873": {"mesa": 185, "nombre": "CUELLAR MORENO ROGER JESUS"},
    "224000470": {"mesa": 185, "nombre": "ESPINOZA PADILLA MELANI"},
    "224000551": {"mesa": 185, "nombre": "GARCIA ESCOBAR ALEJANDRA FABIOLA"},
    "220048401": {"mesa": 186, "nombre": "GARCIA VEDIA JOSUE"},
    "226033724": {"mesa": 186, "nombre": "GONZALES HINOJOSA AYNARA"},
    "220060177": {"mesa": 186, "nombre": "JIMENEZ PARRAGA ALEN"},
    "222084571": {"mesa": 187, "nombre": "MANSILLA NUÑEZ YOISSY MARIANA"},
    "226207803": {"mesa": 187, "nombre": "MENDEZ GARCIA MIGUEL ANGEL"},
    "221056629": {"mesa": 187, "nombre": "MORON PANIAGUA JUAN EDIL"},
    "221056696": {"mesa": 188, "nombre": "OCAMPO OCAMPO MIGUEL ANGEL"},
    "221183698": {"mesa": 188, "nombre": "PEREIRA RODRIGUEZ PAOLA MIRNA"},
    "217073603": {"mesa": 188, "nombre": "RAMIREZ JIMENEZ OLIVER"},
    "223003115": {"mesa": 189, "nombre": "RODRIGUEZ TRUJILLO AINHOA"},
    "220077193": {"mesa": 189, "nombre": "ROMAN HURTADO ADRIANA JESUS"},
    "226034801": {"mesa": 189, "nombre": "SANCHEZ ANZIETA CAMILA"},
    "218161271": {"mesa": 190, "nombre": "SOLIZ MARTINEZ MARCO ANTONIO"},
    "222085355": {"mesa": 190, "nombre": "SUAREZ ZABALA CAROLINA"},
    "224003232": {"mesa": 190, "nombre": "VERASTEGUI MARAÑON ANGELA MAYTE"},
    "221057757": {"mesa": 191, "nombre": "VILLCA ALMENDRAS JHONATHAN FERNANDO"},
    "225151243": {"mesa": 191, "nombre": "VILLCA RIOS ALIZON MARINA"},
    "226035174": {"mesa": 191, "nombre": "ZURITA QUIMAYA NELVA ESMERALDA"},
}

def clean_text(s):
    if not s:
        return ""
    # Reemplazos de caracteres codificados en WinAnsi
    s = s.replace("\ufffd", "Ñ")
    s = s.replace("\xcd", "Í").replace("\xd1", "Ñ").replace("\xc1", "Á")
    s = s.replace("\xc9", "É").replace("\xd3", "Ó").replace("\xda", "Ú")
    s = s.replace("\xdc", "Ü").replace("\xb0", "°")
    return s.strip()

def split_apellidos_nombres(nombre_completo):
    """
    Separa el nombre completo en primer_apellido, segundo_apellido y nombres.
    Maneja apellidos compuestos comunes (DE LAS MUÑECAS, DA SILVA, DEL GRANADO, etc.)
    y nombres compuestos (MARIA DEL CARMEN, MARIA DE LOS ANGELES, etc.)
    """
    n = clean_text(nombre_completo)
    tokens = n.split()
    if len(tokens) <= 2:
        return tokens[0] if len(tokens) > 0 else "", "", tokens[1] if len(tokens) > 1 else ""

    first_four = " ".join(tokens[:4]).upper()
    first_three = " ".join(tokens[:3]).upper()
    first_two = " ".join(tokens[:2]).upper()

    primer_ap = ""
    rest_tokens = []

    if first_four in ["DE LAS MUÑECAS", "DE LAS MUECAS"]:
        primer_ap = "DE LAS MUÑECAS"
        rest_tokens = tokens[4:]
    elif first_three in ["DE LA CRUZ", "DE LA VEGA", "DE LA BARRA", "DE LA FUENTE", "DE LOS RIOS", "DE LAS MUÑECAS"]:
        primer_ap = first_three
        rest_tokens = tokens[3:]
    elif first_two in ["DA SILVA", "DEL GRANADO", "EL HAGE", "LA FUENTE", "SANTA CRUZ", "SAN MARTINI", "SAN MARTIN", "DE CAMPOS"]:
        primer_ap = first_two
        rest_tokens = tokens[2:]
    elif tokens[0].upper() in ["DEL", "DE"] and len(tokens) > 2:
        primer_ap = tokens[0].upper() + " " + tokens[1].upper()
        rest_tokens = tokens[2:]
    else:
        primer_ap = tokens[0].upper()
        rest_tokens = tokens[1:]

    segundo_ap = ""
    nombres = ""

    if len(rest_tokens) == 0:
        return primer_ap, "", ""
    elif len(rest_tokens) == 1:
        return primer_ap, "", rest_tokens[0]

    r_three = " ".join(rest_tokens[:3]).upper()
    r_two = " ".join(rest_tokens[:2]).upper()

    if r_three in ["DE LA CRUZ", "DE LA VEGA", "DE LA BARRA", "DE LA FUENTE", "DE LOS RIOS"]:
        segundo_ap = r_three
        nombres = " ".join(rest_tokens[3:])
    elif r_two in ["DA SILVA", "DEL GRANADO", "EL HAGE", "LA FUENTE", "SANTA CRUZ", "SAN MARTINI", "SAN MARTIN"]:
        segundo_ap = r_two
        nombres = " ".join(rest_tokens[2:])
    elif rest_tokens[0].upper() in ["DEL", "DE"] and len(rest_tokens) > 2 and r_two not in ["DEL CARMEN", "DEL CIELO", "DEL PILAR", "DEL ROSARIO", "DE LOS"]:
        segundo_ap = rest_tokens[0].upper() + " " + rest_tokens[1].upper()
        nombres = " ".join(rest_tokens[2:])
    else:
        segundo_ap = rest_tokens[0].upper()
        nombres = " ".join(rest_tokens[1:])

    return primer_ap, segundo_ap, nombres

def parse_pdf():
    doc = pymupdf.open(PDF_PATH)
    all_records = []

    for pno, page in enumerate(doc):
        text = page.get_text()
        lines = [clean_text(l) for l in text.split("\n") if l.strip()]

        i = 0
        while i < len(lines):
            line = lines[i]
            m = re.match(r"^(\d{5})\s+(.+)$", line)
            if m:
                num = int(m.group(1))
                facultad = clean_text(m.group(2))
                carrera = clean_text(lines[i+1])
                lugar = clean_text(lines[i+2])
                reg_name = clean_text(lines[i+3])
                si_no1 = clean_text(lines[i+4])
                si_no2 = clean_text(lines[i+5])
                si_no3 = clean_text(lines[i+6])

                reg_m = re.match(r"^(\d+)\s+(.+)$", reg_name)
                if reg_m:
                    reg = reg_m.group(1).strip()
                    nombre_completo = reg_m.group(2).strip()
                    c_int = (si_no1 == "SI")
                    icu = (si_no2 == "SI")
                    ful = (si_no3 == "SI")
                    habilitado = c_int or icu or ful

                    primer_ap, segundo_ap, nombres = split_apellidos_nombres(nombre_completo)

                    all_records.append({
                        "n": num,
                        "registro": reg,
                        "nombre_completo": nombre_completo,
                        "primer_apellido": primer_ap,
                        "segundo_apellido": segundo_ap,
                        "nombres": nombres,
                        "facultad": facultad,
                        "carrera": carrera,
                        "lugar": lugar,
                        "centro_interno": c_int,
                        "icu": icu,
                        "ful": ful,
                        "habilitado_votar": habilitado,
                        "page": pno + 1
                    })
                    i += 6
            i += 1
    return all_records

def assign_mesas(records):
    """
    Asigna las mesas paritarias alfabéticas a los estudiantes de Ciencias Veterinarias (183 a 191).
    Cada mesa cuenta con sus 3 jurados oficiales perfectamente integrados.
    """
    # Filtramos estudiantes de veterinarias
    vets = [r for r in records if "VETERINARIA" in r["facultad"].upper()]

    # Calculamos los límites paritarios basados en las posiciones de los jurados conocidos:
    # Indices jurados:
    # 183: max idx 264
    # 184: min 426, max 559
    # 185: min 672, max 885
    # 186: min 904, max 1101
    # 187: min 1277, max 1454
    # 188: min 1500, max 1779
    # 189: min 1899, max 2025
    # 190: min 2108, max 2379
    # 191: min 2415, max 2483
    cutoffs = [
        300,   # Fin Mesa 183 -> 0 a 299 (300 estudiantes) (Hasta: BARRIOS QUISPE JOSE LUIS)
        600,   # Fin Mesa 184 -> 300 a 599 (300 estudiantes) (Hasta: CONDE CABRERA VERONICA MONSERRAT)
        900,   # Fin Mesa 185 -> 600 a 899 (300 estudiantes) (Hasta: GARCIA SAAVEDRA DAVID EDUARDO)
        1200,  # Fin Mesa 186 -> 900 a 1199 (300 estudiantes) (Hasta: LOBO ROMERO ANDREA)
        1500,  # Fin Mesa 187 -> 1200 a 1499 (300 estudiantes) (Hasta: NUÑEZ SUAREZ NICOLAS)
        1800,  # Fin Mesa 188 -> 1500 a 1799 (300 estudiantes) (Hasta: RENDON PARAPAINO LICY DOLORES)
        2100,  # Fin Mesa 189 -> 1800 a 2099 (300 estudiantes) (Hasta: SOLAR GUTIERREZ DAYAN ISANDER)
        2400,  # Fin Mesa 190 -> 2100 a 2399 (300 estudiantes) (Hasta: VILLALON MONTERO JULIANA)
        len(vets) # Fin Mesa 191 -> 2400 a 2483 (84 estudiantes) (Hasta: ZURITA QUIMAYA NELVA ESMERALDA)
    ]

    for idx, r in enumerate(vets):
        mesa_num = 183
        for m_idx, cut in enumerate(cutoffs):
            if idx < cut:
                mesa_num = 183 + m_idx
                break
        
        reg = r["registro"]
        es_jurado = reg in JURADOS_MAP
        if es_jurado:
            mesa_num = JURADOS_MAP[reg]["mesa"] # Garantiza 100% consistencia con mesa de jurado

        r["mesa"] = mesa_num
        r["es_jurado"] = es_jurado

    # Para otras facultades si las hubiere
    for r in records:
        if "VETERINARIA" not in r["facultad"].upper():
            r["mesa"] = None
            r["es_jurado"] = False

    return records

def main():
    print("Extrayendo registros del PDF...")
    records = parse_pdf()
    print(f"Total registros extraidos del PDF: {len(records)}")

    # Filtrar solo habilitados para votar
    habilitados = [r for r in records if r["habilitado_votar"]]
    print(f"Total personas habilitadas: {len(habilitados)}")

    # Asignar mesas y jurados
    habilitados = assign_mesas(habilitados)

    # Crear directorios de destino
    os.makedirs("src/data", exist_ok=True)

    # 1. Guardar archivo JSON completo de habilitados
    dest_json = "src/data/padron_habilitados.json"
    with open(dest_json, "w", encoding="utf-8") as f:
        json.dump(habilitados, f, ensure_ascii=False, indent=2)
    print(f"Guardado: {dest_json} ({os.path.getsize(dest_json):,} bytes)")

    # Copia en raíz para acceso directo
    with open("padron_habilitados.json", "w", encoding="utf-8") as f:
        json.dump(habilitados, f, ensure_ascii=False, indent=2)

    # 2. Guardar archivo aparte con la lista de todos los registros (txt)
    registros_list = [r["registro"] for r in habilitados]
    dest_txt = "src/data/registros.txt"
    with open(dest_txt, "w", encoding="utf-8") as f:
        for reg in registros_list:
            f.write(f"{reg}\n")
    print(f"Guardado: {dest_txt} ({len(registros_list)} registros)")

    with open("registros.txt", "w", encoding="utf-8") as f:
        for reg in registros_list:
            f.write(f"{reg}\n")

    # 3. Guardar registros en formato JSON array para consumo rápido
    dest_reg_json = "src/data/registros.json"
    with open(dest_reg_json, "w", encoding="utf-8") as f:
        json.dump(registros_list, f, ensure_ascii=False, indent=2)
    print(f"Guardado: {dest_reg_json}")

    # Resumen estadístico
    print("\n--- RESUMEN DE EXTRACCIÓN ---")
    vets = [r for r in habilitados if "VETERINARIA" in r["facultad"].upper()]
    print(f"Facultad Ciencias Veterinarias: {len(vets)} estudiantes habilitados")
    jurados_count = sum(1 for r in vets if r["es_jurado"])
    print(f"Jurados Electorales identificados: {jurados_count} designados")
    for m in range(183, 192):
        count_mesa = sum(1 for r in vets if r["mesa"] == m)
        print(f"  Mesa {m}: {count_mesa} votantes")

if __name__ == "__main__":
    main()
