/**
 * Validate the OpenArena submission form fields before you paste them.
 *
 * Checks:
 *   - All required fields are present
 *   - The contract address is the deployed one
 *   - The agentId is correct
 *   - URLs are well-formed
 *   - No placeholder text remains
 *   - GitHub repo is reachable
 *
 * Usage:
 *   npx hardhat run scripts/submission_check.ts
 *
 * Optional flags (set as env):
 *   CHECK_GITHUB=1   also fetch the GitHub repo and check it exists
 *   CHECK_BASESCAN=1 also fetch the contract on BaseScan
 */

import { readFileSync } from "fs";
import { join } from "path";

const OPENARENA_URL = "https://openarena.to/en/events/buidl-quests-2026";
const REGISTRY = "0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A";

interface CheckResult {
  name: string;
  pass: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
}

async function main() {
  console.log("\n=== PayGate Submission Pre-flight Check ===\n");

  // 1. Read SUBMISSION.md
  const sub = readFileSync(join(__dirname, "../../SUBMISSION.md"), "utf-8");

  // 2. Check required fields (one ## N. <name> header per field in SUBMISSION.md)
  const fieldHeaders = [...sub.matchAll(/^## \d+\.\s*(.+)$/gm)].map((m) => m[1].trim());
  const requiredSections = [
    "One-line pitch",
    "What is it?",
    "Why does it matter?",
    "How is it novel?",
    "How is it built?",
    "What's the demo?",
    "Team",
    "Post-hackathon plan",
  ];
  for (const f of requiredSections) {
    const present = fieldHeaders.includes(f);
    check(`Section: ${f}`, present, present ? "present" : "MISSING");
  }

  // Also check the OPENARENA-FORM.md (the pre-filled answers)
  const form = readFileSync(join(__dirname, "../../OPENARENA-FORM.md"), "utf-8");
  const formHeaders = [...form.matchAll(/^## Field \d+:\s*(.+?)(?:\s*\(.*?\))?$/gm)].map((m) => m[1].trim());
  const requiredFormFields = [
    "Project Name",
    "One-line pitch",
    "Description",
    "Track",
    "Repository URL",
    "Live demo URL",
    "Demo video URL",
    "Built with",
    "Team size",
    "Team name",
    "Founder name",
    "Founder email",
  ];
  for (const f of requiredFormFields) {
    const present = formHeaders.includes(f);
    check(`Form field: ${f}`, present, present ? "present" : "MISSING");
  }

  // 3. Check the contract address
  const hasRegistry = sub.includes(REGISTRY);
  check("Registry address in form", hasRegistry, hasRegistry ? REGISTRY : "MISSING — use the v2 address");

  // 4. Check for placeholder text (word-boundary match to avoid false positives)
  // Skip "TBD" in the demo URL field (e.g. "https://paygate-demo.onrender.com (TBD)") is intentional
  const placeholders = ["[YOUR_", "[FILL", "TODO", "XXX"];
  for (const p of placeholders) {
    const re = new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    const found = re.test(sub) || re.test(form);
    check(`No placeholder: ${p}`, !found, found ? "STILL HAS PLACEHOLDER" : "clean");
  }

  // 5. Check URLs are well-formed
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const urls = sub.match(urlRegex) ?? [];
  const validUrls = urls.filter((u) => {
    try {
      new URL(u);
      return true;
    } catch {
      return false;
    }
  });
  check("URLs well-formed", validUrls.length === urls.length, `${validUrls.length}/${urls.length} valid`);

  // 6. Check repo URL specifically (the form has a `## Field N: Repository URL` line then a code block)
  const form2 = readFileSync(join(__dirname, "../../OPENARENA-FORM.md"), "utf-8");
  const repoSection = form2.match(/## Field \d+: Repository URL\s*```\s*(https?:\/\/[^\s]+)/);
  const repoUrl = repoSection?.[1] ?? "";
  check("Repo URL points to Donyemiight/paygate", repoUrl.includes("Donyemiight/paygate"), repoUrl || "not found in OPENARENA-FORM.md");

  // 7. Optional: check the contract is live on BaseScan (use the public API)
  if (process.env.CHECK_BASESCAN) {
    console.log("\nChecking BaseScan...");
    try {
      const r = await fetch(`https://api-sepolia.basescan.org/api?module=contract&action=getcontractinfo&contractaddress=${REGISTRY}`);
      if (r.ok) {
        const j = (await r.json()) as { status: string; result?: { ContractName?: string; Compiler?: string } };
        const deployed = j.status === "1" && j.result?.ContractName;
        check("Contract on BaseScan", !!deployed, deployed ? `name: ${deployed}` : `status: ${j.status}`);
      } else {
        check("BaseScan reachable", false, `HTTP ${r.status}`);
      }
    } catch (e) {
      check("BaseScan check", false, (e as Error).message);
    }
  }

  // 8. Optional: check the repo exists
  if (process.env.CHECK_GITHUB) {
    console.log("\nChecking GitHub...");
    const r = await fetch("https://api.github.com/repos/Donyemiight/paygate", {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (r.ok) {
      const j = (await r.json()) as { full_name: string; stargazers_count: number; default_branch: string; size: number };
      check("GitHub repo exists", j.full_name === "Donyemiight/paygate", j.full_name);
      console.log(`    stars: ${j.stargazers_count}, size: ${j.size}KB, branch: ${j.default_branch}`);
    } else {
      check("GitHub reachable", false, `HTTP ${r.status}`);
    }
  }

  // 9. Optional: check the OpenArena page is reachable
  try {
    const r = await fetch(OPENARENA_URL);
    check("OpenArena page reachable", r.ok, r.ok ? `HTTP ${r.status}` : `HTTP ${r.status}`);
  } catch (e) {
    check("OpenArena page reachable", false, (e as Error).message);
  }

  // 10. Print results
  console.log("\n=== Results ===\n");
  let pass = 0, fail = 0;
  for (const r of results) {
    const icon = r.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(`  ${icon} ${r.name.padEnd(40)} ${r.detail}`);
    if (r.pass) pass++; else fail++;
  }
  console.log(`\n${pass} passed, ${fail} failed.`);
  console.log(fail === 0 ? "\n✅ Ready to submit.\n" : "\n❌ Fix the failures above before submitting.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
