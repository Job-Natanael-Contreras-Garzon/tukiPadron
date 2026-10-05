#!/usr/bin/env python3
"""
Script de cifrado AES-256-GCM para proteger los datos del Padrón Electoral.
Genera 'src/data/padron.enc.js' a partir de 'src/data/padron_compacto.json'.
"""
import json
import hashlib
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SECRET = "UAGRM_VET_PADRON_2024_2026_PROD_SECURITY_SIG"

def encrypt_padron():
    src_file = "src/data/padron_compacto.json"
    dest_js = "src/data/padron.enc.js"

    if not os.path.exists(src_file):
        print(f"Error: no se encontro {src_file}")
        return

    key = hashlib.sha256(SECRET.encode("utf-8")).digest()
    nonce = os.urandom(12) # 96-bit IV para AES-GCM
    aesgcm = AESGCM(key)

    with open(src_file, "rb") as f:
        raw_data = f.read()

    ciphertext = aesgcm.encrypt(nonce, raw_data, None)

    payload = {
        "iv": base64.b64encode(nonce).decode("utf-8"),
        "data": base64.b64encode(ciphertext).decode("utf-8"),
        "v": 1
    }

    # Guardar como modulo JS exportable
    js_content = f"// Payload cifrado con AES-256-GCM\nexport default {json.dumps(payload, indent=2)};\n"
    with open(dest_js, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"Modulo cifrado generado: {dest_js} ({os.path.getsize(dest_js):,} bytes)")

if __name__ == "__main__":
    encrypt_padron()
