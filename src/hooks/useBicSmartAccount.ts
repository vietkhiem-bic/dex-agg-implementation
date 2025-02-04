import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { AuthSession, SIGNER_TYPE } from "../types";
import useChainApiClient from "./useBicChainClient";
import { createSmartAccountController } from "@beincom/aa-coinbase";
import { arbitrum } from "viem/chains";
import { getBicSigner, MockSigner } from "../utils/bic-signer";
import { createBicSmartAccountClient } from "@beincom/chain-shared";
import { BIC_APP_API_DEV_URL } from "../utils";
import axios from "axios";
import { Address, getAddress, Hex, isHex } from "viem";

const useBicSmartAccount = (signerType: SIGNER_TYPE, priv?: Hex) => {
  const [session] = useLocalStorage<AuthSession | null>(
    "session",
    null
  );
  const [smartAccountAddress, setSmartAccountAddress] = useState<Address | null>(null);
  const [smartAccount, setSmartAccount] =
    useState<Awaited<ReturnType<typeof createSmartAccountController>>>();

  const fetch = async () => { 
    if(!session) { 
      return;
    }
    const client = createBicSmartAccountClient({
      endpoint: `${BIC_APP_API_DEV_URL}/v1/wallet`,
      httpClient: axios.create({
        headers: {
          Authorization: `${session.access_token}`
        }
      })
    });

    if(signerType === SIGNER_TYPE.PRIVATE_KEY) {
      if(!isHex(priv)) { 
        return;
      }
      const signer = new MockSigner(priv || "0x");
      const account = await createSmartAccountController(session.id_token, {
        chain: arbitrum,
        client: client,
        signer,
      });
      await account.setupSmartAccount();
      setSmartAccountAddress(await account.getSmartAccountAddress());
      setSmartAccount(account);
    }
    if(signerType === SIGNER_TYPE.BIC_SIGNER) { 
      const signer = await getBicSigner();
      signer.startSession(session.access_token);
      const systemOwner = await signer.getSystemOwnerAddress();
      signer.address = getAddress(systemOwner);
  
      const account = await createSmartAccountController(session.id_token, {
        chain: arbitrum,
        client: client,
        signer,
      });
      await account.setupSmartAccount();
      setSmartAccountAddress(await account.getSmartAccountAddress());
      setSmartAccount(account);
    }
    
  }

  useEffect(() => {
    fetch();
  }, [session, signerType, priv]);
  

  return {smartAccountAddress, smartAccount};
};

export default useBicSmartAccount;
