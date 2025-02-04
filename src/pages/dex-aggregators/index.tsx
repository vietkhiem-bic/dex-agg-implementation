import type { NextPage } from "next";
import { useCallback, useEffect, useState } from "react";
import {
  Address,
  formatUnits,
  getAddress,
  Hex,
  parseUnits,
  zeroAddress,
} from "viem";
import { arbitrum } from "viem/chains";

import useChainApiClient from "../../hooks/useBicChainClient";
import { ERC20Token, SIGNER_TYPE } from "../../types";
import { QuotesData, SWAP_EXACT } from "@beincom/chain-client";
import LoginForm from "../../components/login-form";
import useBicWallet from "../../hooks/useBicWallet";
import useBalances from "../../hooks/useBalances";
import useBicSmartAccount from "../../hooks/useBicSmartAccount";
import { getExecuteBatch } from "@beincom/aa-coinbase";

const DexAggregator: NextPage = () => {
  const chainClient = useChainApiClient();
  const bicWalletAddress = useBicWallet();

  const chain = arbitrum;

  // TEMP
  const slippage = "0.5";
  const mockAddress = "0x05736be876755De230e809784DEF1937dCB6303e";

  const [signerType, setSignerType] = useState<SIGNER_TYPE>(
    SIGNER_TYPE.BIC_SIGNER
  );
  const [privateKey, setPrivateKey] = useState<Hex>();
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

  const { smartAccountAddress, smartAccount } = useBicSmartAccount(
    signerType,
    privateKey
  );
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
        setSupportTokens([
          {
            address: getAddress("0xaf88d065e77c8cc2239327c5edb3a432268e5831"),
            symbol: "USDC",
            name: "USD Coin",
            decimals: 6,
            isNative: false,
            icon: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png?1696506694",
            isHiddenBridge: false,
            isHiddenSwap: false,
            chainId: Number(arbitrum.id),
          },
          {
            address: getAddress("0xb139400e664144908bF5c9F7a757dC2993eCb139"),
            symbol: "B139",
            name: "B139",
            decimals: 18,
            chainId: Number(arbitrum.id),
            isNative: false,
            icon: "https://chat.beincom.com/api/v4/users/pbeu4myzupy1jrjzhduqwzp53r/image?_=1731405651273",
            isHiddenBridge: false,
            isHiddenSwap: false,
          },
          {
            address: getAddress("0xf97f4df75117a78c1A5a0DBb814Af92458539FB4"),
            symbol: "LINK",
            name: "ChainLink Token",
            decimals: 18,
            chainId: Number(arbitrum.id),
            isNative: false,
            icon: "https://assets.coingecko.com/coins/images/877/standard/chainlink-new-logo.png?1696502009",
            isHiddenBridge: false,
            isHiddenSwap: false,
          },
        ]);
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
    if (!tokenIn || !tokenOut || !amountIn) return;

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
      if (!smartAccount) {
        console.error("Smart account not found");
        return;
      }
      if (quotes.length <= 0) {
        console.error("No quotes found");
        return;
      }
      if (!quotes[selectedQuote]) {
        console.error("Selected quote not found");
        return;
      }
      const quote = quotes[selectedQuote];
      const smartAccountAddress = await smartAccount?.getSmartAccountAddress();
      const buildSwap = await chainClient.wallet.buildQuote({
        chainId: chain.id.toString(),
        deadline: Math.floor(Date.now() / 1000) + 60 * 10,
        dexType: quote.dexType,
        quoteRaw: quote.quoteRaw,
        sender: smartAccountAddress,
        recipient: smartAccountAddress,
        slippageTolerance: Number(parseUnits(slippage, 2)),
      });

      const callData = getExecuteBatch({
        calls: [
          {
            data: buildSwap.callData,
            target: buildSwap.target,
            value: BigInt(buildSwap.value),
          },
        ],
      });

      const tx = await smartAccount?.executeTransactionWithCallData(
        callData,
        false
      );
      console.log("🚀 0xted  ~ handleBuildSwap ~ tx:", tx);
    } catch (error) {
      console.error("Swap failed", error);
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

  // useEffect(() => {
  //   handleGetQuotesForAmountOut();
  // }, [amountOut, tokenIn, tokenOut]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <LoginForm />
      </div>
      <div className="m-6 p-6 w-full mx-auto border rounded-lg shadow-lg bg-white">
        <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
          Config
        </h2>
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
          <label className="block text-gray-700 mb-1">Signer Type</label>
          <div className="flex gap-4">
            <div className="w-1/3">
              <select
                className="w-full h-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={signerType}
                onChange={(e) => setSignerType(Number(e.target.value))}
              >
                <option
                  key={SIGNER_TYPE.BIC_SIGNER}
                  value={SIGNER_TYPE.BIC_SIGNER}
                >
                  BIC Signer
                </option>
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
          </div>
        )}
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
              <input
                type="number"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={amountIn}
                onChange={(e) => {
                  setAmountIn(e.target.value);
                  setSwapExactType(SWAP_EXACT.EXACT_IN);
                }}
              />
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
              <input
                type="text"
                className="w-full p-3 border rounded-lg bg-gray-100 text-gray-600"
                value={amountOut}
                readOnly
              />
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
