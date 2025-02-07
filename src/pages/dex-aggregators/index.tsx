import type { NextPage } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Address,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  getAddress,
  Hex,
  parseUnits,
  zeroAddress,
} from "viem";
import { arbitrum } from "viem/chains";
import { useWalletClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

import { QuotesData, SWAP_EXACT } from "@beincom/chain-client";
import { getExecuteBatch } from "@beincom/aa-coinbase";

import useChainApiClient from "../../hooks/useBicChainClient";
import useNotification from "../../hooks/useNotification";
import useBalances from "../../hooks/useBalances";
import useCoinbaseAccount from "../../hooks/useCoinbaseAccount";

import { ERC20Token, SIGNER_TYPE } from "../../types";
import LoginForm from "../../components/login-form";

import {
  ETH_ADDRESS,
  OWNER_COINBASE_ACCOUNT,
  TOKENS_SUPPORTED,
} from "../../utils";
import { entryPoint06Abi, entryPoint06Address } from "viem/account-abstraction";

const DexAggregator: NextPage = () => {
  const chainClient = useChainApiClient();
  const { data: bundler } = useWalletClient();

  const chain = arbitrum;

  // #region Config Swap
  const [slippage, setSlippage] = useState<string>("5");
  const [deadline, setDeadline] = useState<number>(5 * 60);

  const [signerType, setSignerType] = useState<SIGNER_TYPE>(
    SIGNER_TYPE.PRIVATE_KEY
  );
  const [privateKey, setPrivateKey] = useState<Hex>(OWNER_COINBASE_ACCOUNT);
  const [supportTokens, setSupportTokens] = useState<ERC20Token[]>([]);
  const [tokenIn, setTokenIn] = useState<Address>();
  const [tokenInData, setTokenInData] = useState<ERC20Token>();
  const [tokenOut, setTokenOut] = useState<Address>();
  const [tokenOutData, setTokenOutData] = useState<ERC20Token>();
  const [amountIn, setAmountIn] = useState<string>("");
  const [amountOut, setAmountOut] = useState<string>("");
  const [swapExactType, setSwapExactType] = useState<SWAP_EXACT>();
  const [quotes, setQuotes] = useState<QuotesData["quotes"]>([]);
  const [selectedQuote, setSelectedQuote] = useState<number>(0);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [hash, setHash] = useState<Hex>();

  const { notify } = useNotification();
  const { smartAccountAddress, smartAccount, bundlerClient } =
    useCoinbaseAccount(signerType, privateKey);
  const balances = useBalances(
    smartAccountAddress || zeroAddress,
    supportTokens
  );

  const getSupportTokens = useCallback(async () => {
    if (chainClient) {
      try {
        const { tokens } = await chainClient.wallet.getSupportedTokens({
          chainId: chain.id.toString(),
        });
        setSupportTokens(tokens);
      } catch (error) {
        setSupportTokens(TOKENS_SUPPORTED);
        console.log("Failed to get supported tokens", error);
      }
    }
  }, [chainClient, chain]);

  useEffect(() => {
    getSupportTokens();
  }, [getSupportTokens, chain]);

  const handleChangeTokenIn = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const address = getAddress(e.target.value);
    setTokenIn(address);
    const tokenData = supportTokens.find((token) => token.address === address);
    setTokenInData(tokenData);
    if (address === tokenOut) {
      setTokenOut(zeroAddress);
    }
  };

  const handleChangeTokenOut = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const address = getAddress(e.target.value);
    setTokenOut(address);
    const tokenData = supportTokens.find((token) => token.address === address);
    setTokenOutData(tokenData);
    if (address === tokenIn) {
      setTokenIn(zeroAddress);
    }
  };

  const handleGetQuotesForAmountIn = async () => {
    if (!tokenIn || !tokenOut || !amountIn) {
      // setAmountOut("0");
      // setQuotes([]);
      // notify("Token in, token out, amount in is required", "error");
      return;
    }

    try {
      const parsedAmountIn = parseUnits(amountIn, tokenInData?.decimals || 18);
      const { quotes } = await chainClient.wallet.getQuotes({
        amount: parsedAmountIn.toString(),
        chainId: chain.id.toString(),
        swapExact: SWAP_EXACT.EXACT_IN,
        tokenIn: tokenIn,
        tokenOut: tokenOut,
      });
      if (quotes.length <= 0) {
        setAmountOut("0");
        setQuotes([]);
        return;
      }

      const firstQuote = quotes[0];
      const { amountOut } = firstQuote;
      setAmountOut(
        formatUnits(BigInt(amountOut), tokenOutData?.decimals || 18)
      );
      setQuotes(quotes);
    } catch (error) {
      console.error("Swap failed", error);
    } finally {
    }
  };

  const handleGetQuotesForAmountOut = async () => {
    if (!tokenIn || !tokenOut || !amountOut) return;

    try {
      const parsedAmountOut = parseUnits(
        amountOut,
        tokenOutData?.decimals || 18
      );
      const { quotes } = await chainClient.wallet.getQuotes({
        amount: parsedAmountOut.toString(),
        chainId: chain.id.toString(),
        swapExact: SWAP_EXACT.EXACT_OUT,
        tokenIn: tokenIn,
        tokenOut: tokenOut,
      });
      if (quotes.length <= 0) {
        setAmountIn("0");
        setQuotes([]);
        return;
      }

      const firstQuote = quotes[0];
      const { amountIn } = firstQuote;
      setAmountIn(formatUnits(BigInt(amountIn), tokenInData?.decimals || 18));
      setQuotes(quotes);
    } catch (error) {
      console.error("Swap failed", error);
    } finally {
    }
  };

  const handleBuildSwap = async () => {
    try {
      if (!bundler) {
        notify("Connect wallet to setup bundler", "error");
        return;
      }
      if (!smartAccount) {
        notify("Smart account not found", "error");
        return;
      }
      if (!bundlerClient) {
        notify("Bundler client not found", "error");
        return;
      }
      if (quotes.length <= 0) {
        notify("Quotes not found", "error");
        return;
      }
      if (!quotes[selectedQuote]) {
        notify("Quote not found", "error");
        return;
      }
      setIsSwapping(true);
      const quote = quotes[selectedQuote];
      const smartAccountAddress = smartAccount.address;
      const buildSwap = await chainClient.wallet.buildQuote({
        chainId: chain.id.toString(),
        deadline: Math.floor(Date.now() / 1000) + deadline,
        dexType: quote.dexType,
        quoteRaw: quote.quoteRaw,
        sender: smartAccountAddress,
        recipient: smartAccountAddress,
        slippageTolerance: Number(parseUnits(slippage, 2)),
      });
      const calls = [];
      if (getAddress(quote.tokenIn) !== ETH_ADDRESS) {
        console.log(
          "🚀 0xted  ~ handleBuildSwap ~ uote.amountIn:",
          BigInt(quote.amountIn)
        );
        calls.push({
          value: BigInt(0),
          target: getAddress(quote.tokenIn),
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [buildSwap.target, BigInt(quote.amountIn)],
          }),
        });
      }

      calls.push({
        value: BigInt(buildSwap.value),
        target: buildSwap.target,
        data: buildSwap.callData,
      });
      console.log("🚀 0xted  ~ handleBuildSwap ~ calls:", calls);

      const { callData } = getExecuteBatch({
        calls,
      });

      const rawUserOp = await bundlerClient.prepareUserOperation({
        account: smartAccount,
        callData: callData,
        // calls: calls,
      });
      const signature = await smartAccount.signUserOperation(rawUserOp);
      rawUserOp.signature = signature;

      const hash = await bundler.sendTransaction({
        to: entryPoint06Address,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: entryPoint06Abi,
          functionName: "handleOps",
          args: [
            [
              {
                callData: rawUserOp.callData,
                paymasterAndData: rawUserOp.paymasterAndData,
                signature: rawUserOp.signature,
                callGasLimit: rawUserOp.callGasLimit,
                initCode: rawUserOp.initCode || "0x",
                maxFeePerGas: rawUserOp.maxFeePerGas,
                maxPriorityFeePerGas: rawUserOp.maxPriorityFeePerGas,
                nonce: rawUserOp.nonce,
                preVerificationGas: rawUserOp.preVerificationGas,
                sender: rawUserOp.sender,
                verificationGasLimit: rawUserOp.verificationGasLimit,
              },
            ],
            "0x11e479dc86dda6a435c504b8ff17bcdba2a8dfe3",
          ],
        }),
      });

      notify("Swap success: " + hash, "success");
      setHash(hash);
      setIsSwapping(false);
    } catch (error) {
      setIsSwapping(false);
      notify("Swap failed", "error");
      console.log("Swap failed", error);
    }
  };

  useEffect(() => {
    handleGetQuotesForAmountIn();
  }, [amountIn, tokenIn, tokenOut]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (swapExactType === SWAP_EXACT.EXACT_IN) {
        handleGetQuotesForAmountIn();
      } else if (swapExactType === SWAP_EXACT.EXACT_OUT) {
        handleGetQuotesForAmountOut();
      }
    }, 5 * 1000);

    return () => clearInterval(interval);
  }, [amountIn, amountOut, tokenIn, tokenOut, swapExactType]);

  const amountsUsd = useMemo(() => {
    if (!quotes[selectedQuote]) return { amountInUsd: 0, amountOutUsd: 0 };
    const quote = quotes[selectedQuote];
    return { amountInUsd: Number(quote.amountInUsd).toFixed(2), amountOutUsd: Number(quote.amountOutUsd).toFixed(2) };
  }, [quotes, selectedQuote]);

  const minimumAmount = useMemo(() => {
    if (!quotes[selectedQuote]) return 0;
    const quote = quotes[selectedQuote];
    const MAX_BPS = BigInt(10000);
    const minAmountOut =
      (BigInt(quote.amountOut) * (MAX_BPS - BigInt(Number(slippage) * 100))) /
      MAX_BPS;
    return formatUnits(minAmountOut, tokenOutData?.decimals || 18);
  }, [quotes, selectedQuote]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <LoginForm />
      </div>
      <div className="m-6 p-6 w-full mx-auto border rounded-lg shadow-lg bg-white">
        <div className="mb-4">
          {smartAccount && (
            <div className="mb-4">
              <label className="block text-gray-700 mb-1">
                Smart Account Address
              </label>
              <div className="p-3 border rounded-lg bg-gray-100 text-gray-600">
                {smartAccountAddress}
              </div>
            </div>
          )}
        </div>
        <div className="mb-4">
          <p>Bundler:</p>
          <ConnectButton />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Signer Type</label>
          <div className="flex gap-4">
            <div className="w-1/3">
              <select
                className="w-full h-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={signerType}
                onChange={(e) => setSignerType(Number(e.target.value))}
              >
                {/* <option
                  key={SIGNER_TYPE.BIC_SIGNER}
                  value={SIGNER_TYPE.BIC_SIGNER}
                >
                  BIC Signer
                </option> */}
                <option
                  key={SIGNER_TYPE.PRIVATE_KEY}
                  value={SIGNER_TYPE.PRIVATE_KEY}
                >
                  Private Key
                </option>
              </select>
            </div>
            {signerType === SIGNER_TYPE.PRIVATE_KEY && (
              <div className="w-2/3">
                <input
                  type="text"
                  placeholder="Private Key"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={privateKey || ""}
                  onChange={(e) => setPrivateKey(e.target.value as Hex)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="m-6 p-6 w-full mx-auto border rounded-lg shadow-lg bg-white">
        <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
          Token Swap
        </h2>
        {quotes.length > 0 && (
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Quotes:</h2>
            <div className="flex flex-col gap-2">
              {quotes.map((quote, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer ${
                    selectedQuote === index ? "bg-blue-100" : "bg-white"
                  }`}
                  onClick={() => setSelectedQuote(index)}
                >
                  {quote.dexType} -{" "}
                  {formatUnits(
                    BigInt(quote.amountOut),
                    tokenOutData?.decimals || 18
                  )}{" "}
                  {tokenOutData?.symbol}
                </div>
              ))}
            </div>
            {quotes[selectedQuote] && (
              <div className="text-gray-600">
                <p>Price Impact: {quotes[selectedQuote].priceImpact}%</p>
                <p>Minium Amount: {minimumAmount}</p>
              </div>
            )}
            {hash && (
                <div className="p-3 border rounded-lg bg-gray-100 text-gray-600">
                <a
                  href={`${arbitrum.blockExplorers.default.url}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {hash}
                </a>
                </div>
            )}
          </div>
        )}
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            Setting swap:
          </h2>
          <div className="mb-4 flex gap-4 w-1/4">
            <div className="w-1/2">
              <label className="block text-gray-700 mb-1">Slippage (%)</label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-gray-700 mb-1">
                Deadline (seconds)
              </label>
              <input
                type="number"
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={deadline}
                onChange={(e) => setDeadline(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        <div className="mb-4 flex flex-col gap-4">
          <label className="block text-gray-700 mb-1">
            Sell: {(balances && balances![tokenIn || "0x"]) || "0"}
          </label>
          <div className="flex gap-4">
            <div className="w-1/4">
              <select
                className="w-full h-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={tokenIn}
                onChange={(e) => handleChangeTokenIn(e)}
              >
                <option value={zeroAddress}>Select Token</option>
                {supportTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-3/4">
              <div className="relative">
                <input
                  type="number"
                  value={amountIn}
                  onChange={(e) => {
                    setAmountIn(e.target.value);
                    setSwapExactType(SWAP_EXACT.EXACT_IN);
                  }}
                  className="block w-full p-4 text-md text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                />
                <p className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                  {amountsUsd.amountInUsd}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-4 flex flex-col gap-4">
          <label className="block text-gray-700 mb-1">
            Buy: {(balances && balances![tokenOut || "0x"]) || "0"}
          </label>
          <div className="flex gap-4">
            <div className="w-1/4">
              <select
                className="w-full h-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={tokenOut}
                onChange={(e) => handleChangeTokenOut(e)}
              >
                <option value={zeroAddress}>Select Token</option>
                {supportTokens.map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-3/4">
              <div className="relative">
                <input
                  value={amountOut}
                  className="block w-full p-4 text-md text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  readOnly
                />
                <p className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                  {amountsUsd.amountOutUsd}
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          onClick={handleBuildSwap}
          disabled={isSwapping || !tokenIn || !tokenOut || !amountIn}
        >
          {isSwapping ? "Swapping..." : "Swap"}
        </button>
      </div>
    </div>
  );
};

export default DexAggregator;
