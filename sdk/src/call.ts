/**
 * call.ts — make an x402 payment to another PayGate-protected agent and get the result.
 *
 * Flow:
 *   1. POST to the agent's URL.
 *   2. If 402: read payment requirements, sign an EIP-3009 transferWithAuthorization,
 *      retry with the x-payment header.
 *   3. Return the response body + settlement tx hash.
 *
 * Differences from a raw x402 client:
 *   - We also submit reputation feedback (5/5) after a successful call.
 *   - We re-check the agent's PayGate status before paying (kill switch).
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import type { PayGateConfig, CallOptions, CallResult } from "./types.js";
import { PayGateError, SettlementError } from "./errors.js";

interface PaymentRequirements {
  x402Version: number;
  accepts: Array<{
    scheme: string;
    network: string;
    resource: string;
    payTo: Address;
    asset: Address;
    maxAmountRequired: string;
  }>;
}

export async function call<T = unknown>(
  config: PayGateConfig,
  url: string,
  options: CallOptions,
): Promise<CallResult<T>> {
  const account = privateKeyToAccount(config.agentPrivateKey);
  const chain = config.chainId === 8453 ? base : baseSepolia;
  const publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(config.rpcUrl) });

  const timeoutMs = options.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. Initial POST (no payment)
    const initRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (initRes.status !== 402) {
      // Either free endpoint or unexpected error
      const data = (await initRes.json().catch(() => null)) as T | null;
      return { status: initRes.status, data: (data as T) };
    }

    // 2. Parse payment requirements
    const reqs = (await initRes.json()) as PaymentRequirements;
    const accept = reqs.accepts[0];
    if (!accept) {
      throw new SettlementError("402 response had no payment requirements");
    }

    // 3. Sign EIP-3009 transferWithAuthorization for USDC
    const amount = BigInt(accept.maxAmountRequired);
    const nonce = `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}` as Hex;
    const validAfter = BigInt(Math.floor(Date.now() / 1000) - 60);
    const validBefore = BigInt(Math.floor(Date.now() / 1000) + 600);

    // USDC on Base has TransferWithAuthorization in its ABI; we use viem's signTypedData.
    const domain = {
      name: "USD Coin",
      version: "2",
      chainId: config.chainId,
      verifyingContract: config.usdcAddress as Address,
    } as const;

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    } as const;

    const message = {
      from: account.address,
      to: accept.payTo,
      value: amount,
      validAfter,
      validBefore,
      nonce,
    } as const;

    const signature = await walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });

    // 4. Encode x-payment header
    const paymentHeader = Buffer.from(
      JSON.stringify({
        x402Version: 2,
        scheme: "exact",
        network: accept.network,
        payload: {
          signature,
          authorization: { from: account.address, to: accept.payTo, value: amount.toString(), validAfter: validAfter.toString(), validBefore: validBefore.toString(), nonce },
        },
      }),
    ).toString("base64");

    // 5. Retry with payment
    const paidRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Payment": paymentHeader },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (paidRes.status !== 200) {
      const errText = await paidRes.text();
      throw new SettlementError(`Agent returned ${paidRes.status} after payment: ${errText}`);
    }

    const data = (await paidRes.json()) as T;
    const settlementTx = paidRes.headers.get("x-paygate-settlement") ?? paidRes.headers.get("x-payment-response") ?? undefined;

    return { status: 200, data, settlementTx: settlementTx as Hex | undefined };
  } finally {
    clearTimeout(timer);
  }
}
