import { ethers } from "ethers";
const KEY = "0x2be7b19ec1d3afc2eae7678883a8af0f89941e53b42307b801eb8fce938554a2";
const RPCS = [
  { name: "base-sepolia", url: "https://sepolia.base.org" },
  { name: "base", url: "https://mainnet.base.org" },
];
(async () => {
  for (const { name, url } of RPCS) {
    const p = new ethers.JsonRpcProvider(url, undefined, { staticNetwork: true });
    const w = new ethers.Wallet(KEY, p);
    try {
      const bal = await p.getBalance(w.address);
      console.log(`${name}: ${w.address} = ${ethers.formatEther(bal)} ETH`);
    } catch (e) {
      console.log(`${name}: error - ${(e as Error).message.slice(0, 100)}`);
    }
  }
})();
