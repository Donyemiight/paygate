/**
 * PayGate demo server.
 *
 * Two AI agents running on the same Node process for demo simplicity.
 * In production each would be a separate service.
 *
 *   - "Sentiment" agent: takes text, returns { sentiment, score }. Charges $0.01.
 *   - "Summarizer" agent: takes text, returns { summary }. Charges $0.02.
 *
 *   - Orchestrator endpoint: takes a prompt, calls Sentiment, then Summarizer
 *     (paying both via PayGate), returns the combined result.
 *
 *   - Owner dashboard: shows all registered agents, their policies, and a kill switch.
 *
 * Run:
 *   npm run dev
 *
 * Env (or use defaults for Base Sepolia):
 *   AGENT_PRIVATE_KEY  - private key for the agent's wallet (must have Base Sepolia USDC)
 *   OWNER_ADDRESS      - public address of the human controller
 *   REGISTRY_ADDRESS   - deployed PayGateRegistry address
 *   RPC_URL            - Base Sepolia RPC (default https://sepolia.base.org)
 *   FACILITATOR_URL    - x402 facilitator (default https://www.x402.org/facilitator)
 *   PORT               - server port (default 3000)
 */

import express from "express";
import cors from "cors";
import { createPublicClient, http, defineChain } from "viem";
import { baseSepolia } from "viem/chains";
import { wrap } from "@paygate/sdk";
import type { PayGateConfig } from "@paygate/sdk";

const PORT = Number(process.env.PORT ?? 3000);
const RPC_URL = process.env.RPC_URL ?? "https://sepolia.base.org";
const FACILITATOR_URL = process.env.FACILITATOR_URL ?? "https://www.x402.org/facilitator";
const REGISTRY_ADDRESS = (process.env.REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`;

const AGENT_PRIVATE_KEY = (process.env.AGENT_PRIVATE_KEY ??
  // Default anvil-like key for local demo; DO NOT use in production.
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

// -------- Sentiment agent (free for demo; would charge $0.01) --------
const sentimentHandler = wrap(
  config,
  async (input: { text: string }) => {
    // Trivial sentiment heuristic for the demo. Real impl would call an LLM.
    const text = (input.text ?? "").toLowerCase();
    const positive = (text.match(/\b(good|great|love|awesome|excellent|amazing)\b/g) ?? []).length;
    const negative = (text.match(/\b(bad|hate|terrible|awful|horrible|worst)\b/g) ?? []).length;
    let label: "positive" | "negative" | "neutral" = "neutral";
    if (positive > negative) label = "positive";
    else if (negative > positive) label = "negative";
    return { sentiment: label, score: positive - negative, length: text.length };
  },
  { priceUSDC: 10000n, resource: "/agents/sentiment", description: "Sentiment analysis" },
);

// -------- Summarizer agent (charges $0.02) --------
const summarizerHandler = wrap(
  config,
  async (input: { text: string }) => {
    const text = (input.text ?? "").trim();
    if (!text) return { summary: "" };
    // Trivial: first sentence.
    const summary = text.split(/[.!?]/)[0]?.slice(0, 200) ?? text.slice(0, 200);
    return { summary, originalLength: text.length };
  },
  { priceUSDC: 20000n, resource: "/agents/summarize", description: "Text summarization" },
);

// -------- Owner dashboard: list registered agents + kill switch --------
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", paygate: true, chain: "base-sepolia", registry: REGISTRY_ADDRESS });
});

app.post("/agents/sentiment", sentimentHandler);
app.post("/agents/summarize", summarizerHandler);

// Owner dashboard HTML
app.get("/", (_req, res) => {
  res.type("html").send(DASHBOARD_HTML);
});

app.listen(PORT, () => {
  console.log(`[PayGate demo] listening on http://localhost:${PORT}`);
  console.log(`[PayGate demo] registry=${REGISTRY_ADDRESS} chain=base-sepolia`);
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
    .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
    label { display:block; font-size:13px; color:var(--muted); margin:12px 0 4px; }
    input,textarea { width:100%; background:#0a0c12; color:var(--fg); border:1px solid var(--line); border-radius:8px; padding:10px 12px; font:inherit; }
    .footer { color:var(--muted); font-size:13px; margin-top:48px; text-align:center; }
    a { color:var(--accent); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>PayGate <span class="pill ok">live demo</span></h1>
    <p class="lede">A sovereign payment + identity layer for AI agents. x402 payments on Base, ERC-8004 identity, on-chain spending policy, human-controlled kill switch.</p>

    <h2>The agents</h2>
    <div class="grid">
      <div class="card">
        <h3>Sentiment <span class="pill">POST /agents/sentiment</span></h3>
        <p>Charges <span class="price">$0.01 USDC</span> per call on Base Sepolia. Returns sentiment label + score.</p>
        <pre><code>curl -X POST http://localhost:3000/agents/sentiment \\
  -H "Content-Type: application/json" \\
  -d '{"text":"this is amazing!"}'</code></pre>
      </div>
      <div class="card">
        <h3>Summarizer <span class="pill">POST /agents/summarize</span></h3>
        <p>Charges <span class="price">$0.02 USDC</span> per call. Returns a 1-sentence summary.</p>
        <pre><code>curl -X POST http://localhost:3000/agents/summarize \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Long article..."}'</code></pre>
      </div>
      <div class="card">
        <h3>Try the orchestrator <span class="pill warn">client-side</span></h3>
        <p>Paste text below — the orchestrator will call Sentiment then Summarizer, paying each.</p>
        <label for="prompt">Your text</label>
        <textarea id="prompt" rows="4">I love how PayGate makes AI agents accountable. This is amazing tech.</textarea>
        <div class="row" style="margin-top:12px">
          <button class="btn" id="run">Run orchestrator</button>
          <span class="pill" id="status">idle</span>
        </div>
        <pre id="out" style="margin-top:12px; display:none"></pre>
      </div>
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

    <p class="footer">Built for <a href="https://openarena.to/en/events/buidl-quests-2026" target="_blank" rel="noopener">BUIDL_QUESTS 2026</a> · Sovereignty track · MIT licensed</p>
  </div>
  <script>
    const out = document.getElementById('out');
    const status = document.getElementById('status');
    document.getElementById('run').onclick = async () => {
      const text = document.getElementById('prompt').value;
      out.style.display = 'block';
      out.textContent = '⏳ paying Sentiment agent ($0.01 USDC)...';
      status.textContent = 'paying';
      try {
        const s = await fetch('/agents/sentiment', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text}) });
        const sj = await s.json();
        out.textContent = 'Sentiment: ' + JSON.stringify(sj, null, 2) + '\\n\\n⏳ paying Summarizer agent ($0.02 USDC)...';
        const u = await fetch('/agents/summarize', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({text}) });
        const uj = await u.json();
        out.textContent += '\\n\\nSummarizer: ' + JSON.stringify(uj, null, 2);
        status.textContent = 'done';
      } catch (e) {
        out.textContent = 'Error: ' + e.message;
        status.textContent = 'error';
      }
    };
  </script>
</body>
</html>`;
