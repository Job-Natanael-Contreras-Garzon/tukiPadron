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


# Generate PWA App Icons
pwa_icon = im1.copy().resize((192, 192), Image.Resampling.LANCZOS)
pwa_icon.save("public/icons/icon-192.png", "PNG")
pwa_icon_512 = im1.copy().resize((512, 512), Image.Resampling.LANCZOS)
pwa_icon_512.save("public/icons/icon-512.png", "PNG")
print("Íconos PWA generados con éxito.")
