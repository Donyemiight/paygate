# Security Policy

> Inspired by the GitHub Security Lab disclosure template.
> This document describes how to report a security vulnerability in PayGate, what we commit to, and what you can expect from us.

## Supported versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Active          |
| < 0.1   | ❌ Not supported   |

## Reporting a vulnerability

**Please do not file a public issue for security bugs.**

Email: `security@paygate.dev` (placeholder — replace with your real email before publishing)
Or open a private security advisory on GitHub: https://github.com/Donyemiight/paygate/security/advisories/new

Include the following in your report:

1. **Summary** — one-paragraph description of the issue
2. **Affected component** — contract address, function name, SDK module
3. **Severity** — your assessment (Critical / High / Medium / Low)
4. **Reproduction** — minimal code or transaction that triggers the issue
5. **Impact** — what's the worst-case outcome
6. **Suggested fix** — if you have one

### Example report

```
Subject: [SECURITY] PayGateRegistry: setAllowlist does not flip strict mode

Affected:  PayGateRegistry v0.1.0 (commit e31d3e42, before the v2 fix)
Severity:  High
Impact:    A human owner thinks they have set an allowlist, but canSpend()
           still returns true for non-allowlisted counterparties. The policy
           is silently "open" even after the owner has set explicit entries.

Reproduction:
  1. Register an agent with allowlist mode "open"
  2. Call setAllowlist(0x123..., true)
  3. Call canSpend(1, 0x456...) — returns true (expected: false)

Fix:  In SpendingPolicy.setAllowlist(), set _allowlistStrict = true when
      allowed == true.
```

## What to expect from us

| Time after report | What we do |
|---|---|
| **Within 48 hours** | Acknowledge receipt. Assign a tracking ID. |
| **Within 7 days** | Confirm the vulnerability. Assign severity. |
| **Within 30 days** | Ship a fix. Credit the reporter in CHANGELOG. |
| **Within 90 days** | Public disclosure (coordinated with reporter). |

## Severity classification

| Severity | Definition | Example |
|---|---|---|
| **Critical** | Loss of user funds, or contract can be bricked | Reentrancy that drains the registry |
| **High** | Significant impact but limited scope | The setAllowlist strict-mode bug |
| **Medium** | Operational impact, no funds at risk | Front-running of `rotateWallet()` |
| **Low** | Cosmetic, informational, or theoretical | Gas optimization opportunities |

## Scope

In scope:
- `contracts/src/PayGateRegistry.sol`
- `contracts/src/SpendingPolicy.sol`
- `sdk/src/wrap.ts`, `sdk/src/call.ts`, `sdk/src/register.ts`
- `cli/src/cli.ts`

Out of scope:
- OpenZeppelin contracts (report to OpenZeppelin)
- ERC-8004 registry contracts (report to the ERC-8004 working group)
- Base L2 / Optimism stack (report to Optimism)
- USDC contract (report to Circle)

## Bug bounty

There is **no formal bug bounty** for v0.1.0. We may offer one post-hackathon if PayGate is shortlisted or wins BUIDL_QUESTS 2026.

## Coordinated disclosure

We follow the [Google Project Zero](https://googleprojectzero.blogspot.com/p/vulnerability-disclosure-101.html) 90-day disclosure deadline:

- We will not publicly disclose a vulnerability before a fix is shipped
- We will not sue researchers acting in good faith
- We will credit reporters in CHANGELOG unless they request anonymity
- After 90 days (or fix shipped, whichever first), the issue becomes public

## Safe harbor

We will not pursue legal action against researchers who:
- Act in good faith
- Make a good-faith effort to avoid privacy violations, data destruction, or service disruption
- Only interact with their own accounts / agents
- Do not exploit a vulnerability beyond what is necessary to demonstrate it

## Recognition

Reporters are credited in:
- `CHANGELOG.md` (the fix entry)
- `README.md` (in the "Acknowledgments" section, if they consent)
- A public tweet (if they consent and the issue is Critical/High)

## Contact

- **Email:** security@paygate.dev (placeholder)
- **GitHub Security Advisory:** https://github.com/Donyemiight/paygate/security/advisories/new
- **Encrypted:** PGP key will be published post-v0.2.0

## History

No public security incidents as of v0.1.0 (2026-07-15).
