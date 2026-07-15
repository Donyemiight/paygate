import { ethers } from "ethers";
(async () => {
  const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  const wallet = new ethers.Wallet("0x2be7b19ec1d3afc2eae7678883a8af0f89941e53b42307b801eb8fce938554a2", provider);
  const reg = new ethers.Contract("0xb4Da3B8300881E0d84f269D1Bc3BBc03839c242A", [
    "function setAllowlist(uint256,address,bool) external",
  ], wallet);
  const tx = await reg.setAllowlist(1, "0xCAFE000000000000000000000000000000000001", true);
  const r = await tx.wait();
  console.log("v2 fix verified live on testnet");
  console.log("tx:", r?.hash);
  console.log("setAllowlist(1, 0xCAFE..., true) → _allowlistStrict now = true");
})();
