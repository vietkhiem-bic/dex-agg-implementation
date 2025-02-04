import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { AuthSession } from "../types";
import useChainApiClient from "./useBicChainClient";
import { Address } from "viem";

const useBicWallet = () => {
  const [session] = useLocalStorage<AuthSession | null>(
    "session",
    null
  );
  const chainClient = useChainApiClient();

  const [walletAddress, setWalletAddress] = useState<Address | null>(null);

  const fetch = async () => { 
    if(!session) { 
      return;
    }
    // const result = await chainClient.wallet.getBalances();
    setWalletAddress("0xEc178789d353e383F2eEaBE5272880cd865C1D8A");
  }

  useEffect(() => {
    fetch();
  }, [session]);
  

  return walletAddress;
};

export default useBicWallet;
