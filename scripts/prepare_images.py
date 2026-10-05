import os
from PIL import Image, ImageDraw, ImageFont

SRC1 = r"C:\Users\contr\.gemini\antigravity\brain\e832cb3c-cc49-4e68-a513-3e8c0252e8eb\.user_uploaded\media_1791229644897.png"
SRC2 = r"C:\Users\contr\.gemini\antigravity\brain\e832cb3c-cc49-4e68-a513-3e8c0252e8eb\.user_uploaded\media_1791229746856.png"

os.makedirs("public/images", exist_ok=True)
os.makedirs("public/icons", exist_ok=True)

# 1. Convert source images to webp
im1 = Image.open(SRC1).convert("RGBA")
im2 = Image.open(SRC2).convert("RGBA")

im1.save("public/images/logo1.webp", "WEBP", quality=90)
im2.save("public/images/logo2.webp", "WEBP", quality=90)
print("Logos convertidos a WebP")

# Generate 10 carousel images in WebP (hero-1.webp to hero-10.webp)
# Alternating and stylizing with background cards and banners
slides_meta = [
    {"src": im1, "tag": "Unidad Veterinaria 2024-2026", "sub": "¡Tu voto define el futuro de la facultad!"},
    {"src": im2, "tag": "Consultor Electoral Rápido", "sub": "Encuentra tu mesa en menos de 1 segundo"},
    {"src": im1, "tag": "¿Eres Jurado Electoral?", "sub": "Consulta aquí tu designación oficial"},
    {"src": im2, "tag": "Medicina Veterinaria y Zootecnia", "sub": "Mesas 183 a 191 habilitadas"},
    {"src": im1, "tag": "Modo 100% Offline Activo", "sub": "Funciona sin señal ni datos móviles"},
    {"src": im2, "tag": "Elecciones UAGRM 2024-2026", "sub": "Centro Interno · ICU · FUL"},
    {"src": im1, "tag": "¡No olvides tu Documento!", "sub": "Cédula de identidad o carnet universitario"},
    {"src": im2, "tag": "Mesas Paritarias Alfabéticas", "sub": "Distribución equitativa y transparente"},
    {"src": im1, "tag": "Participa con Orgullo", "sub": "Unidad Veterinaria somos todos"},
    {"src": im2, "tag": "Padrón Oficial UAGRM", "sub": "Consulta segura y confiable"}
]

W, H = 800, 450 # 16:9 banner proportion for mobile and desktop

for i, meta in enumerate(slides_meta, 1):
    banner = Image.new("RGBA", (W, H), (49, 166, 202, 255)) # #31A6CA
    draw = ImageDraw.Draw(banner)
    
    # Gradient overlay effect
    for y in range(H):
        r = int(49 + (53 - 49) * (y / H))
        g = int(166 + (169 - 166) * (y / H))
        b = int(202 + (198 - 202) * (y / H))
        draw.line([(0, y), (W, y)], fill=(r, g, b, 255))
    
    # Decorative circle
    draw.ellipse([W - 380, -40, W + 120, H + 60], fill=(255, 255, 255, 30))
    draw.ellipse([W - 320, 20, W + 60, H], fill=(236, 125, 23, 40)) # #EC7D17

    # Paste mascot image on the right/center
    logo = meta["src"].copy()
    logo.thumbnail((360, 360), Image.Resampling.LANCZOS)
    
    # Calculate position
    pos_x = W - logo.width - 30
    pos_y = (H - logo.height) // 2
    banner.paste(logo, (pos_x, pos_y), logo)

    # Save slide in WebP
    out_path = f"public/images/hero-{i}.webp"
    banner.convert("RGB").save(out_path, "WEBP", quality=85)
    print(f"Generado {out_path} ({os.path.getsize(out_path):,} bytes)")

# Generate PWA App Icons
pwa_icon = im1.copy().resize((192, 192), Image.Resampling.LANCZOS)
pwa_icon.save("public/icons/icon-192.png", "PNG")
pwa_icon_512 = im1.copy().resize((512, 512), Image.Resampling.LANCZOS)
pwa_icon_512.save("public/icons/icon-512.png", "PNG")
print("Íconos PWA generados con éxito.")
