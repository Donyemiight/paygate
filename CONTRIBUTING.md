# Contributing to PayGate

Thanks for your interest. PayGate is open source (MIT) and contributions are welcome.

## Quick start

```bash
git clone https://github.com/Donyemiight/paygate
cd paygate
npm install --workspaces

# Run tests
cd contracts
npx hardhat test
# 13/13 should pass

# Run integration test on Base Sepolia
DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/integration_test.ts --network baseSepolia
# 13/13 should pass

# Build the SDK
cd ../sdk
npm run build

# Run the demo
cd ../demo
REGISTRY_ADDRESS=0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A \
  AGENT_PRIVATE_KEY=0x... \
  npm start
# → http://localhost:3000
```

## How to contribute

### Reporting bugs

Open a GitHub issue with:
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, OS, hardhat version, etc)
- For contract bugs: transaction hash, block number, contract address

### Suggesting features

Open a GitHub issue with the `enhancement` label. Tag the issue with the relevant area:
- `area/contracts` — Solidity contracts
- `area/sdk` — TypeScript SDK
- `area/demo` — Demo server
- `area/cli` — paygate CLI
- `area/docs` — documentation

### Submitting code

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make your changes
4. Run the tests: `npx hardhat test` (must all pass)
5. Run the integration test on Base Sepolia (recommended)
6. Update the relevant docs (README, ARCHITECTURE, FAQ, etc.)
7. Update CHANGELOG.md
8. Push and open a PR

### PR template

```
## What
One-paragraph description of the change.

## Why
Why is this needed? Reference a GitHub issue if there is one.

## How
Technical approach. Any new dependencies? Any breaking changes?

## Tests
What tests did you add? How did you verify?

## Docs
What docs did you update?
```

### Code style

- Solidity: follow the [Solidity style guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- TypeScript: 2-space indent, single quotes, semicolons required
- Comments: explain WHY, not WHAT

## Project structure

```
paygate/
├── contracts/      # Solidity contracts (Hardhat + Forge compatible)
├── sdk/            # TypeScript SDK
├── demo/           # Express demo server
├── cli/            # Terminal CLI
├── docs/           # Long-form documentation
├── public/         # Static pages (landing, 5-attacks explainer)
└── *.md            # Top-level docs (README, SECURITY, CHANGELOG, etc.)
```

## Areas that need help

- **More tests** — invariant testing, fuzzing, formal verification
- **Other chain deployments** — Ethereum mainnet, Arbitrum, Optimism, Polygon
- **Multi-asset support** — EURC, USDT, cbBTC
- **ERC-8004 cross-references** — see ROADMAP.md
- **Translations** — internationalize the docs and demo UI
- **Examples** — build a "PayGate in 100 lines" example app

## Communication

- GitHub issues: for bugs, features, questions
- Pull requests: for code contributions
- Email `security@paygate.dev` for security disclosures only (not for general questions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Code of conduct

Be kind. Disagree on substance, not on people. No harassment, no discrimination, no personal attacks.

Maintainers reserve the right to close threads that violate these norms.
