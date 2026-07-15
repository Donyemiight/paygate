import { ethers } from "ethers";
const ADDR = "0x2be7b19ec1d3afc2eae7678883a8af0f89941e53b42307b801eb8fce938554a2";
const WALLETS = [
  "0x2be7b19ec1d3afc2eae7678883a8af0f89941e53b42307b801eb8fce938554a2",
];
(async () => {
  const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  for (const w of WALLETS) {
    const wallet = new ethers.Wallet(w, provider);
    const bal = await provider.getBalance(wallet.address);
    console.log(`${wallet.address}: ${ethers.formatEther(bal)} ETH`);
  }
})();
