import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { AuthSession, ERC20Token } from "../types";
import useChainApiClient from "./useBicChainClient";
import { Address, erc20Abi, formatUnits, getAddress } from "viem";
import { usePublicClient } from "wagmi";
import { arbitrum, forma } from "viem/chains";

const useBalances = (address: Address, tokens: ERC20Token[]) => {
  const [balances, setBalances] = useState<{ [key: Address]: string}>({});

  const publicClient = usePublicClient({
    chainId: arbitrum.id,
  });

  const fetch = async () => { 
    if(!publicClient) { 
      return;
    }
    if(tokens.length <= 0) { return }
    const result = await publicClient.multicall({
      contracts: tokens.map(token => ({
        abi: erc20Abi,
        address: token.address,
        functionName: "balanceOf",
        args: [address],
      })),
    });

    const balances = result.reduce((acc: { [key: Address]: string }, r, i) => {
      acc[getAddress(tokens[i].address)] = formatUnits(BigInt(r.result as bigint), tokens[i].decimals);
      return acc;
    }, {});
    setBalances(balances);
  }

  useEffect(() => {
    fetch();
  }, [publicClient, tokens, address]);
  

  return balances;
};

export default useBalances;
