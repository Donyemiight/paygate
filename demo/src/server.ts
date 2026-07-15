/**
 * PayGate demo server — final version.
 *
 * Three AI agents running on the same Node process for demo simplicity.
 * In production each would be a separate service.
 *
 *   - "Sentiment" agent: free demo. Naive heuristic.
 *   - "Summarizer" agent: $0.02. Trivial first-sentence extract.
 *   - "Translate" agent: $0.03. Real LLM (OpenAI gpt-4o-mini) with mock fallback.
 *
 *   - Orchestrator endpoint: takes a prompt, calls Sentiment, then Summarizer,
 *     then Translate (paying each via PayGate), returns the combined result.
 *
 *   - Owner dashboard: shows all registered agents, their policies, and a kill switch.
 *
 *   - All x402-gated. Real payments on Base Sepolia in USDC.
 *
 * Run:
 *   REGISTRY_ADDRESS=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A \
 *   AGENT_PRIVATE_KEY=0x... \
 *   npm start
 *
 * Env:
 *   AGENT_PRIVATE_KEY  - required, private key for the agent's wallet
 *   OWNER_ADDRESS      - public address of the human controller
 *   REGISTRY_ADDRESS   - deployed PayGateRegistry address
 *   RPC_URL            - Base Sepolia RPC (default https://sepolia.base.org)
 *   FACILITATOR_URL    - x402 facilitator (default https://www.x402.org/facilitator)
 *   PORT               - server port (default 3000, Render uses 10000)
 *   OPENAI_API_KEY     - optional. If set, Translate agent uses real gpt-4o-mini.
 */

import express from "express";
import cors from "cors";
import { wrap } from "@paygate/sdk";
import type { PayGateConfig } from "@paygate/sdk";
import { translateHandler } from "./agents/translate.js";
import { mountDirectory } from "./directory.js";

const PORT = Number(process.env.PORT ?? 3000);
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? "https://www.x402.org/facilitator";
const REGISTRY_ADDRESS = (process.env.REGISTRY_ADDRESS ?? "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A") as `0x${string}`;
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`;

const AGENT_PRIVATE_KEY = (process.env.AGENT_PRIVATE_KEY ??
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80") as `0x${string}`;

const OWNER_ADDRESS = (process.env.OWNER_ADDRESS ??
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266") as `0x${string}`;

const config: PayGateConfig = {
  agentPrivateKey: AGENT_PRIVATE_KEY,
  ownerAddress: OWNER_ADDRESS,
  registryAddress: REGISTRY_ADDRESS,
  usdcAddress: USDC_BASE_SEPOLIA,
  facilitatorUrl: FACILITATOR_URL,
  rpcUrl: RPC_URL,
  chainId: 84532,
};

// ====================================================================
// Agent 1: Sentiment (free, no x402)
// ====================================================================
const sentimentHandler = async (input: { text: string }) => {
  const text = (input.text ?? "").toLowerCase();
  const positive = (text.match(/\b(good|great|love|awesome|excellent|amazing)\b/g) ?? []).length;
  const negative = (text.match(/\b(bad|hate|terrible|awful|horrible|worst)\b/g) ?? []).length;
  let label: "positive" | "negative" | "neutral" = "neutral";
  if (positive > negative) label = "positive";
  else if (negative > positive) label = "negative";
  return { sentiment: label, score: positive - negative, length: text.length };
};

// ====================================================================
// Agent 2: Summarizer ($0.02)
// ====================================================================
const summarizerHandler = wrap(
  config,
  async (input: { text: string }) => {
    const text = (input.text ?? "").trim();
    if (!text) return { summary: "", originalLength: 0 };
    const summary = text.split(/[.!?]/)[0]?.slice(0, 200) ?? text.slice(0, 200);
    return { summary, originalLength: text.length };
  },
  { priceUSDC: 20000n, resource: "/agents/summarize", description: "Text summarization" },
);

// ====================================================================
// Agent 3: Translate ($0.03) — LLM-backed with mock fallback
// ====================================================================
const translateAgentHandler = wrap(
  config,
  translateHandler,
  { priceUSDC: 30000n, resource: "/agents/translate", description: "Translate text to target language" },
);

// ====================================================================
// Express app
// ====================================================================

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    paygate: true,
    chain: "base-sepolia",
    registry: REGISTRY_ADDRESS,
    openai: Boolean(process.env.OPENAI_API_KEY),
    agents: ["sentiment (free)", "summarize ($0.02)", "translate ($0.03)"],
  });
});

app.post("/agents/sentiment", async (req, res) => {
  try {
    const out = await sentimentHandler(req.body);
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/agents/summarize", summarizerHandler);
app.post("/agents/translate", translateAgentHandler);

// Owner dashboard HTML
app.get("/", (_req, res) => {
  res.type("html").send(DASHBOARD_HTML);
});

// SKILL.md (x402 / agent discovery)
app.get("/.well-known/SKILL.md", (_req, res) => {
  res.type("text/markdown").send(SKILL_MD);
});
app.get("/skill.md", (_req, res) => {
  res.type("text/markdown").send(SKILL_MD);
});

// PayGate Directory — read on-chain registry, list all agents
mountDirectory(app);

app.listen(PORT, () => {
  console.log(`[PayGate demo] listening on http://localhost:${PORT}`);
  console.log(`[PayGate demo] registry=${REGISTRY_ADDRESS} chain=base-sepolia`);
  console.log(`[PayGate demo] openai=${Boolean(process.env.OPENAI_API_KEY) ? "live" : "mock"}`);
});

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>PayGate — Sovereign Agent Payments on Base</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { --bg:#0b0d12; --fg:#e7e9ee; --muted:#8b94a7; --accent:#7c5cff; --line:#1c2030; --ok:#22c55e; --warn:#f59e0b; --err:#ef4444; }
    * { box-sizing: border-box; }
    body { margin:0; font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--fg); background:linear-gradient(180deg,#0b0d12 0%,#11141d 100%); min-height:100vh; }
    .wrap { max-width:1080px; margin:0 auto; padding:32px 24px 80px; }
    h1 { font-size:42px; line-height:1.1; margin:0 0 8px; letter-spacing:-.02em; }
    h2 { font-size:20px; margin:32px 0 12px; color:var(--muted); font-weight:600; }
    .lede { color:var(--muted); font-size:18px; margin:0 0 32px; max-width:60ch; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:16px; margin:24px 0; }
    .card { background:#141823; border:1px solid var(--line); border-radius:12px; padding:18px; }
    .card h3 { margin:0 0 6px; font-size:16px; }
    .card .price { color:var(--accent); font-weight:600; }
    .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; background:#1c2030; color:var(--muted); margin-left:6px; }
    .pill.ok { background:rgba(34,197,94,.12); color:var(--ok); }
    .pill.warn { background:rgba(245,158,11,.12); color:var(--warn); }
    .pill.err { background:rgba(239,68,68,.12); color:var(--err); }
    pre { background:#0a0c12; border:1px solid var(--line); border-radius:8px; padding:14px; overflow:auto; font-size:13px; }
    code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
    .btn { display:inline-block; padding:8px 14px; border-radius:8px; background:var(--accent); color:#fff; border:0; cursor:pointer; font-weight:600; font-size:14px; }
    .btn.ghost { background:transparent; color:var(--fg); border:1px solid var(--line); }
    .btn.danger { background:var(--err); }
    .btn.ok { background:var(--ok); }
    .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    label { display:block; font-size:13px; color:var(--muted); margin:12px 0 4px; }
    input,textarea,select { width:100%; background:#0a0c12; color:var(--fg); border:1px solid var(--line); border-radius:8px; padding:10px 12px; font:inherit; }
    .footer { color:var(--muted); font-size:13px; margin-top:48px; text-align:center; }
    a { color:var(--accent); }
    .out { margin-top:10px; min-height: 40px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>PayGate <span class="pill ok">live demo</span></h1>
    <p class="lede">A sovereign payment + identity layer for AI agents. x402 payments on Base, ERC-8004 identity, on-chain spending policy, human-controlled kill switch.</p>

    <h2>The agents</h2>
    <div class="grid">
      <div class="card">
        <h3>Sentiment <span class="pill ok">free</span></h3>
        <p>Returns sentiment label + score. <span class="pill">POST /agents/sentiment</span></p>
        <pre><code>curl -X POST http://localhost:3000/agents/sentiment \\
  -H "Content-Type: application/json" \\
  -d '{"text":"this is amazing!"}'</code></pre>
      </div>
      <div class="card">
        <h3>Summarizer <span class="pill warn">$0.02</span></h3>
        <p>Returns a 1-sentence summary. x402-gated on Base Sepolia.</p>
        <pre><code>curl -X POST http://localhost:3000/agents/summarize \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Long article..."}'</code></pre>
      </div>
      <div class="card">
        <h3>Translate <span class="pill warn">$0.03</span></h3>
        <p>LLM-backed translation. Real gpt-4o-mini if OPENAI_API_KEY is set, otherwise mock.</p>
        <pre><code>curl -X POST http://localhost:3000/agents/translate \\
  -H "Content-Type: application/json" \\
  -d '{"text":"hello world","targetLang":"French"}'</code></pre>
      </div>
    </div>

    <h2>Try the orchestrator</h2>
    <div class="card">
      <p>Paste text below. The orchestrator will call Sentiment (free), then Summarizer ($0.02), then Translate ($0.03). All payments settle on Base Sepolia.</p>
      <label for="prompt">Your text</label>
      <textarea id="prompt" rows="4">I love how PayGate makes AI agents accountable. This is amazing tech that I want to share with the world.</textarea>
      <label for="lang" style="margin-top:10px">Translate to</label>
      <select id="lang">
        <option>French</option>
        <option>Spanish</option>
        <option>Japanese</option>
        <option>German</option>
      </select>
      <div class="row" style="margin-top:12px">
        <button class="btn" id="run">Run all 3 agents</button>
        <button class="btn danger" id="pause">Kill switch (deactivate)</button>
        <button class="btn ok" id="resume" style="display:none">Resume</button>
        <span class="pill" id="status">idle</span>
      </div>
      <pre id="out" class="out" style="display:none"></pre>
    </div>

    <h2>What PayGate adds on top of plain x402</h2>
    <div class="grid">
      <div class="card">
        <h3>ERC-8004 identity</h3>
        <p>Each agent gets a portable on-chain handle on Base. Other agents can verify who they're paying.</p>
      </div>
      <div class="card">
        <h3>Spending policy</h3>
        <p>Per-call cap, per-epoch cap, allowlist. The human owner sets it once, the chain enforces it forever.</p>
      </div>
      <div class="card">
        <h3>Kill switch</h3>
        <p>One transaction pauses the agent. No race condition, no admin key, no "please contact support".</p>
      </div>
      <div class="card">
        <h3>Reputation</h3>
        <p>After every call, feedback is written to the ERC-8004 Reputation Registry. Other agents see it before they pay.</p>
      </div>
    </div>

    <p class="footer">Live on Base Sepolia: <a href="https://sepolia.basescan.org/address/0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A" target="_blank" rel="noopener">0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A</a> · Built for <a href="https://openarena.to/en/events/buidl-quests-2026" target="_blank" rel="noopener">BUIDL_QUESTS 2026</a> · MIT licensed · <a href="https://github.com/Donyemiight/paygate" target="_blank" rel="noopener">github.com/Donyemiight/paygate</a></p>
  </div>
  <script>
    const out = document.getElementById('out');
    const status = document.getElementById('status');
    const pause = document.getElementById('pause');
    const resume = document.getElementById('resume');
    let paused = false;

    pause.onclick = async () => {
      try {
        await fetch('/admin/pause', { method: 'POST' });
        paused = true;
        pause.style.display = 'none';
        resume.style.display = 'inline-block';
        status.textContent = 'kill switch ON';
        status.className = 'pill err';
      } catch (e) { status.textContent = 'error: ' + e.message; }
    };
    resume.onclick = async () => {
      try {
        await fetch('/admin/resume', { method: 'POST' });
        paused = false;
        pause.style.display = 'inline-block';
        resume.style.display = 'none';
        status.textContent = 'resumed';
        status.className = 'pill ok';
      } catch (e) { status.textContent = 'error: ' + e.message; }
    };

    document.getElementById('run').onclick = async () => {
      if (paused) { out.style.display='block'; out.textContent='⛔ kill switch is on. Click Resume first.'; return; }
      const text = document.getElementById('prompt').value;
      const lang = document.getElementById('lang').value;
      out.style.display = 'block';
      out.textContent = '⏳ sentiment (free)...';
      status.textContent = 'running';
      try {
        const s = await fetch('/agents/sentiment', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text}) });
        const sj = await s.json();
        out.textContent = 'Sentiment: ' + JSON.stringify(sj, null, 2) + '\\n\\n⏳ paying Summarizer ($0.02)...';

        const u = await fetch('/agents/summarize', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text}) });
        const uj = await u.json();
        out.textContent += '\\n\\nSummarizer: ' + JSON.stringify(uj, null, 2) + '\\n\\n⏳ paying Translate ($0.03)...';

        const t = await fetch('/agents/translate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text, targetLang: lang}) });
        const tj = await t.json();
        out.textContent += '\\n\\nTranslate: ' + JSON.stringify(tj, null, 2);
        status.textContent = 'done';
        status.className = 'pill ok';
      } catch (e) {
        out.textContent += '\\n\\nError: ' + e.message;
        status.textContent = 'error';
        status.className = 'pill err';
      }
    };
  </script>
</body>
</html>`;

const SKILL_MD = `---
name: paygate-demo
version: 0.1.0
description: PayGate demo — three x402-protected agents (Sentiment, Summarizer, Translate) on Base Sepolia, wrapped in on-chain spending policy + kill switch.
homepage: https://github.com/Donyemiight/paygate
metadata:
  paygate-registry: "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A"
  chain: "base-sepolia"
  chain-id: 84532
  track: "BUIDL_QUESTS-2026-sovereignty"
  license: "MIT"
---

# PayGate Demo Agents

A demo deployment of [PayGate](https://github.com/Donyemiight/paygate) showing three agents
paying each other via x402, all wrapped in on-chain spending policy and a kill switch.

## Agents

### 1. Sentiment (free)
- **Endpoint:** \`POST /agents/sentiment\`
- **Price:** free
- **Input:** \`{ "text": string }\`
- **Output:** \`{ "sentiment": "positive"|"negative"|"neutral", "score": number, "length": number }\`

### 2. Summarizer ($0.02)
- **Endpoint:** \`POST /agents/summarize\`
- **Price:** $0.02 USDC on Base Sepolia
- **Input:** \`{ "text": string }\`
- **Output:** \`{ "summary": string, "originalLength": number }\`

### 3. Translate ($0.03)
- **Endpoint:** \`POST /agents/translate\`
- **Price:** $0.03 USDC on Base Sepolia
- **Input:** \`{ "text": string, "targetLang": "French"|"Spanish"|"Japanese"|"German" }\`
- **Output:** \`{ "translation": string, "sourceLang": string, "targetLang": string, "model": string, "charCount": number }\`

## Payment

All paid agents return HTTP 402 with x402 v2 payment requirements. Use [@paygate/sdk](https://github.com/Donyemiight/paygate) to pay and retry:

\`\`\`typescript
import { call } from "@paygate/sdk";
const result = await call(cfg, "https://paygate-demo.onrender.com/agents/summarize", {
  amount: 20000n, // $0.02 in 6-decimal USDC
  body: { text: "..." },
});
\`\`\`

## Authentication

None required. Agents are paid, not authenticated.

## PayGate protection

Every paid agent is bound to a PayGateRegistry entry on Base Sepolia with:
- per-call cap: $0.10
- per-epoch cap: $1.00 (24h)
- allowlist: open
- kill switch: one-transaction \`registry.deactivate()\`

The policy is enforced by the contract, not the SDK — a compromised agent cannot bypass it.
`;
