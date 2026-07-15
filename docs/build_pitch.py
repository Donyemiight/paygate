"""
Build PayGate pitch deck PDF (4 pages).
"""

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
    Image,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "/workspace/paygate/docs/PITCH-DECK.pdf"

# Use landscape letter for slides
PAGE = landscape(letter)

doc = SimpleDocTemplate(
    OUT,
    pagesize=PAGE,
    leftMargin=0.6 * inch,
    rightMargin=0.6 * inch,
    topMargin=0.5 * inch,
    bottomMargin=0.5 * inch,
    title="PayGate Pitch Deck — BUIDL_QUESTS 2026",
    author="O.A Dolapo",
)

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=36, leading=42, spaceAfter=12, textColor=colors.HexColor("#0a0a0a"), alignment=TA_CENTER)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=22, leading=28, spaceAfter=8, textColor=colors.HexColor("#0a0a0a"))
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=14, leading=18, spaceAfter=6, spaceBefore=10, textColor=colors.HexColor("#0a0a0a"))
P = ParagraphStyle("P", parent=styles["BodyText"], fontSize=12, leading=16, spaceAfter=6)
PB = ParagraphStyle("PB", parent=P, fontName="Helvetica-Bold")
PI = ParagraphStyle("PI", parent=P, fontSize=14, leading=20, alignment=TA_CENTER, spaceAfter=10)
PBIG = ParagraphStyle("PBIG", parent=P, fontName="Helvetica-Bold", fontSize=18, leading=24, alignment=TA_CENTER, textColor=colors.HexColor("#7c5cff"))
CODE = ParagraphStyle("CODE", parent=P, fontName="Courier", fontSize=9, leading=12)
SMALL = ParagraphStyle("SMALL", parent=P, fontSize=9, leading=12, textColor=colors.HexColor("#666666"))
ACCENT = ParagraphStyle("ACCENT", parent=P, fontName="Helvetica-Bold", fontSize=14, textColor=colors.HexColor("#7c5cff"), alignment=TA_CENTER)

story = []

# ============== SLIDE 1: Title ==============
story.append(Spacer(1, 1.4*inch))
story.append(Paragraph("PayGate", H1))
story.append(Paragraph("Sovereign payment + identity layer for AI agents", H3))
story.append(Spacer(1, 0.4*inch))
story.append(Paragraph("x402 + ERC-8004 + on-chain policy + kill switch", PBIG))
story.append(Spacer(1, 0.6*inch))
story.append(Paragraph("BUIDL_QUESTS 2026 · Track 02 — Sovereignty", ACCENT))
story.append(Spacer(1, 0.4*inch))
story.append(Paragraph("O.A Dolapo", PI))
story.append(Paragraph("Live on Base Sepolia: 0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A", SMALL))
story.append(Paragraph("https://github.com/Donyemiight/paygate", SMALL))
story.append(PageBreak())

# ============== SLIDE 2: The problem ==============
story.append(Paragraph("The problem", H2))
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph(
    "AI agents can pay each other with <b>x402</b> now. 169+ SDKs. 13,000+ services. $0 to send a micropayment.",
    P
))
story.append(Paragraph(
    "But a compromised or misaligned agent can drain its owner's wallet. The owner has no way to stop it.",
    P
))
story.append(Spacer(1, 0.3*inch))

# 5 attacks table
story.append(Paragraph("The 5 known attacks on x402 (arXiv:2605.11781, May 2026):", PB))
attack_data = [
    ["#", "Attack", "Impact"],
    ["1", "Grant-before-settle", "Server runs work before payment is confirmed"],
    ["2", "Missing resource-identifier binding", "Pay for A, get B"],
    ["3", "Fire-and-forget settlement", "Server claims it paid but didn't"],
    ["4", "Missing Cache-Control", "402 response gets cached, payment skipped"],
    ["5", "Replay", "One payment → many services"],
]
attack_table = Table(attack_data, colWidths=[0.4*inch, 2.5*inch, 4.5*inch])
attack_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7c5cff")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 10),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
]))
story.append(attack_table)
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph(
    "And x402 itself has no <b>identity</b> (who's paying?), no <b>policy</b> (how much can they spend?), "
    "no <b>kill switch</b> (how do I stop them?), and no <b>reputation</b> (are they trustworthy?).",
    P
))
story.append(PageBreak())

# ============== SLIDE 3: The solution ==============
story.append(Paragraph("The solution", H2))
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph(
    "PayGate wraps any x402 agent with 3 on-chain primitives:",
    P
))
story.append(Spacer(1, 0.2*inch))

# 3 cards
def card(title, body, color):
    return [
        Paragraph(f"<b>{title}</b>", ParagraphStyle("ct", parent=P, fontName="Helvetica-Bold", fontSize=14, textColor=colors.white)),
        Spacer(1, 6),
        Paragraph(body, ParagraphStyle("cb", parent=P, fontSize=11, leading=15, textColor=colors.white)),
    ]

cards = Table(
    [[
        card("Identity", "ERC-8004 on Base. 17,600+ agents already registered. Portable on-chain handle. No central server.", colors.HexColor("#7c5cff")),
        card("Policy", "Per-call cap. Per-epoch cap. Allowlist. Enforced by the contract, not the SDK. A compromised agent cannot bypass.", colors.HexColor("#22c55e")),
        card("Kill switch", "One transaction pauses the agent. No admin key. No race condition. The owner stays in control.", colors.HexColor("#f59e0b")),
    ]],
    colWidths=[2.7*inch, 2.7*inch, 2.7*inch],
    rowHeights=[2.2*inch],
)
cards.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#7c5cff")),
    ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#22c55e")),
    ("BACKGROUND", (2, 0), (2, 0), colors.HexColor("#f59e0b")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 14),
    ("RIGHTPADDING", (0, 0), (-1, -1), 14),
    ("TOPPADDING", (0, 0), (-1, -1), 14),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
]))
story.append(cards)
story.append(Spacer(1, 0.3*inch))

story.append(Paragraph("Drop-in usage:", PB))
story.append(Spacer(1, 0.1*inch))
story.append(Paragraph(
    "<font face='Courier'>import { wrap } from \"@paygate/sdk\";\n"
    "app.post(\"/api\", wrap(cfg, async (input) => myAgent(input), { priceUSDC: 10000n }));</font>",
    CODE
))
story.append(Spacer(1, 0.2*inch))
story.append(Paragraph(
    "<b>3 lines.</b> Your endpoint now returns 402, accepts x402, records on-chain spend, and respects the kill switch.",
    P
))
story.append(PageBreak())

# ============== SLIDE 4: Live, ready, win ==============
story.append(Paragraph("Live. Tested. Ready.", H2))
story.append(Spacer(1, 0.2*inch))

stats_data = [
    ["Code", "Tests", "Live", "Documents"],
    [
        "2 contracts\n5 SDK files\n3 agents\n1 CLI",
        "13/13 Hardhat\n7/7 on-chain\nForge suite",
        "Base Sepolia\n0xb4Da...242A",
        "1-page PDF\nREADME\nARCHITECTURE\nSECURITY\nDEPLOY\nFAQ",
    ],
]
stats_table = Table(stats_data, colWidths=[2*inch, 2*inch, 2*inch, 2*inch], rowHeights=[0.4*inch, 1.5*inch])
stats_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#7c5cff")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, 0), 12),
    ("FONTSIZE", (0, 1), (-1, 1), 10),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(stats_table)
story.append(Spacer(1, 0.4*inch))

story.append(Paragraph("Why PayGate wins", H3))
win_data = [
    ["✓", "Novelty", "First contract-enforced spending policy + kill switch for x402"],
    ["✓", "Standard-composed", "Uses ERC-8004 as a consumer; works for the 17,600+ existing agents"],
    ["✓", "Security-first", "Mitigates all 5 known x402 attacks; full threat model in SECURITY.md"],
    ["✓", "Open source", "MIT licensed, single-binary deploy, drop-in 3-line integration"],
]
win_table = Table(win_data, colWidths=[0.4*inch, 1.4*inch, 6.3*inch])
win_table.setStyle(TableStyle([
    ("FONTSIZE", (0, 0), (-1, -1), 11),
    ("GRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#dddddd")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#22c55e")),
    ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ("FONTNAME", (1, 0), (1, -1), "Helvetica-Bold"),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(win_table)

story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Asks", H3))
story.append(Paragraph(
    "• Top 20 selection → travel support to Singapore, mentorship, AWS credits\n"
    "• Top 10 selection → closed-door pitch to investors at Amber Group's network\n"
    "• Any placement → cash + credits, exposure to 250K+ developer community on OpenArena + DoraHacks",
    P
))

doc.build(story)
print(f"Generated: {OUT}")
