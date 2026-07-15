"""
Generate PayGate security one-pager PDF using reportlab.
No LaTeX dependency.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "/workspace/paygate/docs/SECURITY-ONE-PAGE.pdf"

doc = SimpleDocTemplate(
    OUT,
    pagesize=letter,
    leftMargin=0.6 * inch,
    rightMargin=0.6 * inch,
    topMargin=0.6 * inch,
    bottomMargin=0.6 * inch,
    title="PayGate Security One-Pager",
    author="O.A Dolapo",
)

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=15, spaceAfter=6, textColor=colors.HexColor("#0a0a0a"))
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=11, spaceAfter=4, spaceBefore=8, textColor=colors.HexColor("#0a0a0a"))
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=10, spaceAfter=2, spaceBefore=4, textColor=colors.HexColor("#0a0a0a"))
P = ParagraphStyle("P", parent=styles["BodyText"], fontSize=8.5, leading=11, spaceAfter=3)
PB = ParagraphStyle("PB", parent=P, fontName="Helvetica-Bold")
CODE = ParagraphStyle("CODE", parent=P, fontName="Courier", fontSize=7.5, leading=9.5, leftIndent=10, textColor=colors.HexColor("#444444"))
SMALL = ParagraphStyle("SMALL", parent=P, fontSize=7, leading=9, textColor=colors.HexColor("#666666"))

story = []

story.append(Paragraph("PayGate — Security One-Pager", H1))
story.append(Paragraph(
    "<b>Project:</b> PayGate · Sovereign payment + identity layer for AI agents &nbsp;|&nbsp; "
    "<b>Track:</b> BUIDL_QUESTS 2026 — Sovereignty &nbsp;|&nbsp; "
    "<b>Contract:</b> <font face='Courier' size='8'>0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A</font> on Base Sepolia",
    P
))
story.append(Paragraph(
    "<b>Status:</b> v0.1.0, not yet audited. Pre-mainnet recommendations in <font face='Courier'>docs/SECURITY.md</font>.",
    SMALL
))
story.append(Spacer(1, 4))

# What is PayGate
story.append(Paragraph("What PayGate is", H2))
story.append(Paragraph(
    "x402 (Coinbase, May 2025) lets AI agents pay each other USDC over HTTP. "
    "PayGate is an x402 wrapper that adds three primitives x402 doesn't have: "
    "<b>on-chain identity</b> (ERC-8004), <b>on-chain spending policy</b>, "
    "and a <b>one-transaction kill switch</b>.",
    P
))

# Threat model
story.append(Paragraph("Threat model", H2))
threat_data = [
    ["Component", "Trust", "PayGate's response"],
    ["Compromised agent wallet", "Untrusted (assumed)", "Caps enforced at the contract, not the SDK"],
    ["Compromised agent SDK", "Untrusted", "Policy is in SpendingPolicy.recordSpend() — reverts on cap"],
    ["Compromised human owner", "Medium", "Operational risk (rotate wallet, cold storage)"],
    ["x402 facilitator lies", "Medium", "wrap() awaits on-chain receipt before running handler"],
    ["ERC-8004 registry upgrade", "Low (high-trust multisig)", "Out of PayGate's scope; affects all consumers"],
]
threat_table = Table(threat_data, colWidths=[1.6*inch, 1.4*inch, 4*inch])
threat_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0a0a0a")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
]))
story.append(threat_table)
story.append(Spacer(1, 4))

# Mitigations
story.append(Paragraph("Mitigations for the 5 known x402 attacks (arXiv:2605.11781)", H2))
mit_data = [
    ["#", "Attack", "PayGate mitigation"],
    ["1", "Grant-before-settle", "Settle via facilitator, await on-chain receipt, then run handler"],
    ["2", "Missing resource-identifier binding", "402 'resource' field = request path; EIP-3009 auth is path-bound"],
    ["3", "Fire-and-forget settlement", "Synchronous /settle + waitForTransactionReceipt; 200 not sent until confirmed"],
    ["4", "Missing Cache-Control", "Every 402 and 200 includes Cache-Control: no-store"],
    ["5", "Replay", "EIP-3009 single-use nonce + SpendingPolicy epoch counter + per-call cap"],
]
mit_table = Table(mit_data, colWidths=[0.3*inch, 1.7*inch, 5*inch])
mit_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0a0a0a")),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 3),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
]))
story.append(mit_table)
story.append(Spacer(1, 4))

# Smart contract security controls
story.append(Paragraph("Smart contract security controls", H2))
controls = [
    ("OpenZeppelin 5.x Ownable(msg.sender)", "explicit initial-owner pattern (no silent ownership)"),
    ("ReentrancyGuard", "on all state-modifying functions in both contracts"),
    ("Custom errors", "all 9 revert paths are named (NotOwner, Paused_, ExceedsPerCallLimit, etc) — no string reverts"),
    ("onlyAgentOwner modifier", "a random address cannot pause someone else's agent"),
    ("Per-agent SpendingPolicy", "owned by the registry, not the human — clean privilege separation"),
    ("Hardhat test suite", "13/13 tests pass (register, rotate, deactivate, canSpend, recordSpend, etc)"),
    ("On-chain smoke test", "7/7 checks pass on Base Sepolia with the deployed v2 contract"),
    ("Live + verified", "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A on Base Sepolia (chain 84532)"),
]
for k, v in controls:
    story.append(Paragraph(f"<b>• {k}:</b> {v}", P))

# What's NOT yet protected
story.append(Paragraph("What's NOT yet protected (acknowledged in SECURITY.md)", H2))
not_protected = [
    "No two-step <font face='Courier'>rotateWallet</font> handover — front-running possible. Planned for v0.2.",
    "Allowlist is a <font face='Courier'>mapping + bool</font> flag, not enumerable.",
    "No formal verification or external audit yet.",
    "No batched settlement (multi-spend in one tx).",
    "Compromise of the human owner's key is operational risk, not contract risk.",
]
for line in not_protected:
    story.append(Paragraph(f"• {line}", P))

# Pre-mainnet audit recommendations
story.append(Paragraph("Pre-mainnet audit recommendations", H2))
audit_recs = [
    "Two-step wallet rotation (mitigates front-running)",
    "Add EpochReset event for setLimits (observability)",
    "Replace single-bool _allowlistStrict with enumerable set",
    "External audit by Halborn (BUIDL_QUESTS co-sponsor) — targeted for post-hackathon",
    "Formal verification of the spending-policy invariants (Certora or similar)",
    "Fuzz testing of wrap() and call() flows (Echidna / Foundry invariant testing)",
]
for line in audit_recs:
    story.append(Paragraph(f"• {line}", P))

# Disclosure + TLDR
story.append(Paragraph("Disclosure", H2))
story.append(Paragraph(
    "Security issues: open a GitHub issue at <font face='Courier'>github.com/Donyemiight/paygate/issues</font> "
    "with the label <b>security</b>. Response within 48 hours.",
    P
))

story.append(Paragraph("TL;DR", H2))
story.append(Paragraph(
    "PayGate turns x402 from \"agents can pay each other\" into \"agents can pay each other, the human stays "
    "in control, and a compromised agent can be paused in 1 transaction.\" The contract is small (2 files, "
    "~250 LOC), tested, and live. Full threat model + audit recommendations in <font face='Courier'>docs/SECURITY.md</font>.",
    P
))

doc.build(story)
print(f"Generated: {OUT}")
