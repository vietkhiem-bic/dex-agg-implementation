import { Address } from "viem";

export type ERC20Token = {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    isNative: boolean;
    icon: string;
    isHiddenBridge: boolean;
    isHiddenSwap: boolean;
    chainId: string | number;
};