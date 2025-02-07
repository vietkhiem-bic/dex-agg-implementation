import { getAddress } from "viem";
import { arbitrum } from "viem/chains";

export const ETH_ADDRESS = getAddress("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
export const TOKENS_SUPPORTED = [
  {
    address: ETH_ADDRESS,
    symbol: "ETH",
    name: "ETH Coin",
    decimals: 18,
    isNative: false,
    icon: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png?1696506694",
    isHiddenBridge: false,
    isHiddenSwap: false,
    chainId: Number(arbitrum.id),
  },
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
    address: getAddress("0x3A8f583b44fC86C32C192A377cb5e861310f869D"),
    symbol: "TB139",
    name: "TB139",
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
];
