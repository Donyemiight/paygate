"""
Generate PayGate OG image (1200x630, PNG) for social sharing.
"""

from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
import sys

OUT_PNG = sys.argv[1] if len(sys.argv) > 1 else "/workspace/paygate/public/og.png"

# Use reportlab's PDF generation then we'll convert to PNG with imagemagick
# But simpler: just use PIL/Pillow if available, or write SVG and rasterize

# Try with Pillow
try:
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1200, 630
    img = Image.new("RGB", (W, H), color="#0b0d12")
    draw = ImageDraw.Draw(img)

    # gradient-like background using overlapping rectangles
    for i in range(20):
        alpha = int(255 * (1 - i / 20) * 0.05)
        c = HexColor("#7c5cff")
        x = W - 200 - i * 20
        y = -200 + i * 10
        draw.ellipse([x, y, x + 600 + i * 10, y + 600 + i * 10], fill=None, outline=(124, 92, 255, alpha))

    # Title
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 96)
        sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 32)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
        mono_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 18)
    except OSError:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        mono_font = ImageFont.load_default()

    # "PayGate"
    draw.text((60, 180), "PayGate", font=title_font, fill="#e7e9ee")

    # tagline
    draw.text((60, 310), "Sovereign payment + identity layer for AI agents", font=sub_font, fill="#8b94a7")

    # 3 pills
    pill_y = 410
    pills = [
        ("Identity", "#7c5cff"),
        ("Policy", "#22c55e"),
        ("Kill switch", "#f59e0b"),
    ]
    x = 60
    for text, color in pills:
        text_w = draw.textlength(text + "  ", font=small_font)
        # pill background
        draw.rounded_rectangle([x, pill_y, x + text_w + 30, pill_y + 50], radius=25, fill=color)
        draw.text((x + 15, pill_y + 12), text, font=small_font, fill="#0b0d12")
        x += text_w + 50

    # bottom bar
    draw.text((60, 530), "x402 + ERC-8004 + on-chain policy · Live on Base Sepolia", font=small_font, fill="#8b94a7")
    draw.text((60, 565), "github.com/Donyemiight/paygate", font=mono_font, fill="#7c5cff")

    # badge
    draw.text((60, 60), "BUIDL_QUESTS 2026 · Sovereignty Track", font=small_font, fill="#7c5cff")

    img.save(OUT_PNG, "PNG")
    print(f"Generated: {OUT_PNG}")
except ImportError:
    print("Pillow not available; falling back to simple SVG")

    # Write a simple SVG
    OUT_SVG = OUT_PNG.replace(".png", ".svg")
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0b0d12"/>
<circle cx="1000" cy="100" r="300" fill="#7c5cff" opacity="0.10"/>
<text x="60" y="80" font-family="sans-serif" font-size="22" fill="#7c5cff" font-weight="bold">BUIDL_QUESTS 2026 · Sovereignty Track</text>
<text x="60" y="280" font-family="sans-serif" font-size="96" fill="#e7e9ee" font-weight="bold">PayGate</text>
<text x="60" y="350" font-family="sans-serif" font-size="32" fill="#8b94a7">Sovereign payment + identity layer for AI agents</text>
<rect x="60" y="420" width="200" height="50" rx="25" fill="#7c5cff"/>
<text x="85" y="453" font-family="sans-serif" font-size="22" fill="#0b0d12" font-weight="bold">Identity</text>
<rect x="280" y="420" width="160" height="50" rx="25" fill="#22c55e"/>
<text x="305" y="453" font-family="sans-serif" font-size="22" fill="#0b0d12" font-weight="bold">Policy</text>
<rect x="460" y="420" width="240" height="50" rx="25" fill="#f59e0b"/>
<text x="485" y="453" font-family="sans-serif" font-size="22" fill="#0b0d12" font-weight="bold">Kill switch</text>
<text x="60" y="555" font-family="sans-serif" font-size="22" fill="#8b94a7">x402 + ERC-8004 + on-chain policy · Live on Base Sepolia</text>
<text x="60" y="590" font-family="monospace" font-size="18" fill="#7c5cff">github.com/Donyemiight/paygate</text>
</svg>'''
    with open(OUT_SVG, "w") as f:
        f.write(svg)
    print(f"Generated: {OUT_SVG}")
