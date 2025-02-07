import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { createBundlerClient, toCoinbaseSmartAccount } from "viem/account-abstraction";
import { Address, Hex, isHex, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { BUNDLER_API_URL } from "../utils";
import { AuthSession, SIGNER_TYPE } from "../types";


const useCoinbaseAccount = (signerType: SIGNER_TYPE, priv?: Hex) => {
  const [session] = useLocalStorage<AuthSession | null>("session", null);
  const [smartAccountAddress, setSmartAccountAddress] =
    useState<Address | null>(null);
  const [smartAccount, setSmartAccount] =
    useState<Awaited<ReturnType<typeof toCoinbaseSmartAccount>>>();

  const publicClient = createPublicClient({
    chain: arbitrum,
    transport: http(),
  });

  const bundlerClient = createBundlerClient({
    client: publicClient,
    transport: http( BUNDLER_API_URL.alchemy),
  });

  const fetch = async () => {
    // if (!session) {
    //   return;
    // }
    // const client = createBicSmartAccountClient({
    //   endpoint: `${BIC_APP_API_DEV_URL}/v1/wallet`,
    //   httpClient: axios.create({
    //     headers: {
    //       Authorization: `${session.access_token}`,
    //     },
    //   }),
    // });

    if (signerType === SIGNER_TYPE.PRIVATE_KEY) {
      if (!isHex(priv)) {
        return;
      }
      const owner = privateKeyToAccount(priv);
      const account = await toCoinbaseSmartAccount({ 
        client: publicClient, 
        owners: [owner], 
      });
      setSmartAccount(account);
      setSmartAccountAddress(account.address);
    }
    // if (signerType === SIGNER_TYPE.BIC_SIGNER) {
    //   const signer = await getBicSigner();
    //   signer.startSession(session.access_token);
    //   const systemOwner = await signer.getSystemOwnerAddress();
    //   signer.address = getAddress("0x8c0680ab06a61BD92e4cB0BfBb4f8531384a6d99");

    //   const account = await createSmartAccountController(session.id_token, {
    //     chain: arbitrumSepolia,
    //     client: client,
    //     signer,
    //   });
    //   await account.setupSmartAccount();
    //   setSmartAccountAddress(await account.getSmartAccountAddress());
    //   setSmartAccount(account);
    // }
  };

  useEffect(() => {
    fetch();
  }, [session, signerType, priv]);

  return { smartAccountAddress, smartAccount, bundlerClient };
};

export default useCoinbaseAccount;
