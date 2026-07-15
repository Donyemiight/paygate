import { ethers } from "ethers";
const KEY = "0x2be7b19ec1d3afc2eae7678883a8af0f89941e53b42307b801eb8fce938554a2";
(async () => {
  // try a working Sepolia RPC
  const p = new ethers.JsonRpcProvider("https://1rpc.io/sepolia");
  const w = new ethers.Wallet(KEY, p);
  try {
    const bal = await p.getBalance(w.address);
    console.log(`sepolia-1rpc: ${w.address} = ${ethers.formatEther(bal)} ETH`);
  } catch (e) {
    console.log("sepolia-1rpc: error -", (e as Error).message.slice(0, 100));
  }
})();
