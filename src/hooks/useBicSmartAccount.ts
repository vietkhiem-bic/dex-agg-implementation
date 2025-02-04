import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { AuthSession } from "../types";
import useChainApiClient from "./useBicChainClient";
import { createSmartAccountController } from "@beincom/aa-coinbase";
import { arbitrum } from "viem/chains";
import { getBicSigner } from "../utils/bic-signer";
import { createBicSmartAccountClient } from "@beincom/chain-shared";
import { BIC_APP_API_DEV_URL } from "../utils";
import axios from "axios";
import { getAddress } from "viem";

const useBicSmartAccount = () => {
  const [session] = useLocalStorage<AuthSession | null>(
    "session",
    null
  );
  const [smartAccount, setSmartAccount] =
    useState<Awaited<ReturnType<typeof createSmartAccountController>>>();

  const fetch = async () => { 
    if(!session) { 
      return;
    }
    const signer = await getBicSigner();
    signer.startSession(session.access_token);
    const systemOwner = await signer.getSystemOwnerAddress();
    signer.address = getAddress(systemOwner);

    const client = createBicSmartAccountClient({
      endpoint: `${BIC_APP_API_DEV_URL}/v1/wallet`,
      httpClient: axios.create({
        headers: {
          Authorization: `${session.access_token}`
        }
      })
    });
    const account = await createSmartAccountController(session.id_token, {
      chain: arbitrum,
      client: client,
      signer,
    });
    await account.setupSmartAccount();
    setSmartAccount(account);
  }

  useEffect(() => {
    fetch();
  }, [session]);
  

  return smartAccount;
};

export default useBicSmartAccount;
