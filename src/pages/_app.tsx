import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';

import { config } from '../wagmi';
import { useEffect, useState } from 'react';
import { loadWasm } from '../utils/bic-signer';

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  const [isLoadWasm, setIsLoadWasm] = useState<boolean>(false);

  useEffect(() => {
    loadWasm().then(() => {
        setTimeout(() => {
            setIsLoadWasm(true)
        }, 1000)
    })
})
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider>
          {
            isLoadWasm && <Component {...pageProps} />
          }
          {
            !isLoadWasm && <div>Loading WASM</div>
          }
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
