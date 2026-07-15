/**
 * PayGate Directory — a small Express server that reads the on-chain registry
 * and serves a browsable list of all registered PayGate agents.
 *
 * Endpoints:
 *   GET /          — HTML directory page
 *   GET /api/agents — JSON list of all agents
 *   GET /api/agents/:id — JSON detail for one agent
 *
 * Run:
 *   REGISTRY_ADDRESS=0x09A4b760Ea42325508fC6b9b6777CAb667071595 \
 *   AGENT_PRIVATE_KEY=0x... \
 *   node --import tsx demo/src/directory.ts
 *
 *   (or as part of the main demo server at /directory)
 */

import express from "express";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { getAgentIdentity, getAgentReputation, ERC8004_BASE } from "@paygate/sdk";

const REGISTRY = (process.env.REGISTRY_ADDRESS ?? "0x09A4b760Ea42325508fC6b9b6777CAb667071595") as `0x${string}`;
const RPC = process.env.RPC_URL ?? "https://sepolia.base.org";

export function mountDirectory(app: express.Express) {
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

  app.get("/api/agents", async (_req, res) => {
    try {
      const nextId = (await publicClient.readContract({
        address: REGISTRY,
        abi: [
          {
            name: "nextAgentId",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "nextAgentId",
      } as any)) as bigint;

      const agents = [];
      for (let i = 1; i < Number(nextId); i++) {
        try {
          const b = (await publicClient.readContract({
            address: REGISTRY,
            abi: [
              {
                name: "getBinding",
                type: "function",
                stateMutability: "view",
                inputs: [{ name: "agentId", type: "uint256" }],
                outputs: [
                  { name: "erc8004AgentId", type: "uint256" },
                  { name: "agentWallet", type: "address" },
                  { name: "policy", type: "address" },
                  { name: "humanOwner", type: "address" },
                  { name: "metadataURI", type: "string" },
                  { name: "active", type: "bool" },
                ],
              },
            ],
            functionName: "getBinding",
            args: [BigInt(i)],
          } as any)) as readonly [bigint, string, string, string, string, boolean];

          // fetch policy state
          const pol = (await publicClient.readContract({
            address: b[2] as `0x${string}`,
            abi: [
              {
                name: "getPolicy",
                type: "function",
                stateMutability: "view",
                inputs: [],
                outputs: [
                  { name: "perCallLimit", type: "uint128" },
                  { name: "perEpochLimit", type: "uint128" },
                  { name: "epochDuration", type: "uint64" },
                  { name: "epochSpent", type: "uint128" },
                  { name: "paused", type: "bool" },
                ],
              },
            ],
            functionName: "getPolicy",
          } as any).catch(() => null)) as readonly [bigint, bigint, bigint, bigint, boolean] | null;

          // optional: ERC-8004 reputation
          let reputation = null;
          if (b[0] > 0n) {
            try {
              reputation = await getAgentReputation(RPC, 84532, b[0], 20);
            } catch { /* ignore */ }
          }

          agents.push({
            paygateAgentId: i,
            erc8004AgentId: b[0].toString(),
            agentWallet: b[1],
            policy: b[2],
            humanOwner: b[3],
            metadataURI: b[4],
            active: b[5],
            policyState: pol
              ? {
                  perCallLimit: pol[0].toString(),
                  perEpochLimit: pol[1].toString(),
                  epochDuration: pol[2].toString(),
                  epochSpent: pol[3].toString(),
                  paused: pol[4],
                }
              : null,
            reputation,
          });
        } catch (e) {
          agents.push({ paygateAgentId: i, error: (e as Error).message.slice(0, 100) });
        }
      }
      res.json({ count: agents.length, registry: REGISTRY, chain: "base-sepolia", agents });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.get("/directory", (_req, res) => {
    res.type("html").send(DIRECTORY_HTML);
  });
}

const DIRECTORY_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>PayGate Directory — Sovereign Agents on Base</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root { --bg:#0b0d12; --fg:#e7e9ee; --muted:#8b94a7; --accent:#7c5cff; --line:#1c2030; --ok:#22c55e; --warn:#f59e0b; --err:#ef4444; }
    * { box-sizing: border-box; }
    body { margin:0; font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--fg); background:var(--bg); min-height:100vh; }
    .wrap { max-width:1100px; margin:0 auto; padding:40px 24px 80px; }
    h1 { font-size:40px; line-height:1.1; margin:0 0 8px; letter-spacing:-.02em; }
    .lede { color:var(--muted); font-size:18px; margin:0 0 24px; max-width:60ch; }
    .meta { color:var(--muted); font-size:13px; margin-bottom:24px; }
    .meta a { color:var(--accent); }
    table { width:100%; border-collapse:collapse; margin-top:16px; font-size:14px; }
    th, td { padding:12px 10px; text-align:left; border-bottom:1px solid var(--line); }
    th { color:var(--muted); font-weight:600; font-size:12px; text-transform:uppercase; letter-spacing:.04em; }
    td.mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; }
    .pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; }
    .pill.ok { background:rgba(34,197,94,.12); color:var(--ok); }
    .pill.warn { background:rgba(245,158,11,.12); color:var(--warn); }
    .pill.err { background:rgba(239,68,68,.12); color:var(--err); }
    .pill.muted { background:#1c2030; color:var(--muted); }
    code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; }
    .empty { padding:60px 0; text-align:center; color:var(--muted); }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>PayGate Directory <span class="pill ok">live</span></h1>
    <p class="lede">All agents registered on the PayGateRegistry contract on Base Sepolia. Each row is a sovereign identity with on-chain policy and a kill switch.</p>
    <p class="meta">Registry: <code>0x09A4b760Ea42325508fC6b9b6777CAb667071595</code> · <a href="/api/agents" target="_blank" rel="noopener">JSON API</a> · <a href="https://sepolia.basescan.org/address/0x09A4b760Ea42325508fC6b9b6777CAb667071595" target="_blank" rel="noopener">BaseScan</a></p>
    <div id="root">Loading...</div>
  </div>
  <script>
    fetch('/api/agents').then(r => r.json()).then(data => {
      const root = document.getElementById('root');
      if (!data.agents || data.agents.length === 0) {
        root.innerHTML = '<div class="empty">No agents registered yet. Run the demo first to register one.</div>';
        return;
      }
      const rows = data.agents.map(a => {
        if (a.error) return '<tr><td class="mono">' + a.paygateAgentId + '</td><td colspan="5" class="mono" style="color:var(--err)">error: ' + a.error + '</td></tr>';
        const pol = a.policyState;
        const repBadge = a.reputation
          ? '<span class="pill ok">rep: ' + a.reputation.averageScore.toFixed(1) + '/100 (' + a.reputation.totalFeedback + ')</span>'
          : '<span class="pill muted">no ERC-8004</span>';
        const status = !a.active
          ? '<span class="pill err">DEACTIVATED</span>'
          : pol && pol.paused
            ? '<span class="pill err">PAUSED</span>'
            : '<span class="pill ok">ACTIVE</span>';
        const cap = pol
          ? '$' + (Number(pol.perCallLimit) / 1e6).toFixed(2) + '/call · $' + (Number(pol.perEpochLimit) / 1e6).toFixed(2) + '/epoch'
          : '—';
        const spent = pol ? '$' + (Number(pol.epochSpent) / 1e6).toFixed(4) : '—';
        return '<tr>' +
          '<td class="mono">' + a.paygateAgentId + '</td>' +
          '<td class="mono">' + (a.erc8004AgentId !== '0' ? '#' + a.erc8004AgentId : '—') + '</td>' +
          '<td class="mono">' + a.agentWallet.slice(0, 8) + '…' + a.agentWallet.slice(-4) + '</td>' +
          '<td class="mono">' + cap + '</td>' +
          '<td class="mono">' + spent + '</td>' +
          '<td>' + status + ' ' + repBadge + '</td>' +
        '</tr>';
      }).join('');
      root.innerHTML = '<table><thead><tr><th>PayGate ID</th><th>ERC-8004</th><th>Wallet</th><th>Cap</th><th>Spent</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table>';
    });
  </script>
</body>
</html>`;
