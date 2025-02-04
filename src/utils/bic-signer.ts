import { getCreateWasmBicSignerFn } from "@beincom/signers/wasm";
import { BIC_APP_API_DEV_URL } from "./constants";
import { IAccount, ISigner } from "@beincom/chain-shared";
import { Hex, PrivateKeyAccount } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export async function loadWasm() {
    const wasm = await import("@beincom/bic-signer-wasm");
    await wasm.lib.init(undefined);
}

let signer: ReturnType<Awaited<ReturnType<typeof getCreateWasmBicSignerFn>>>;

export async function getBicSigner() {
    if (signer) {
        return signer;
    }
    const fn = await getCreateWasmBicSignerFn();
    signer = fn({
        debug: { level: 4 },
        maxRetries: 3,
        platform: {
            platform: "browser",
        },
        refreshSession(args: any): Promise<string> {
            return Promise.resolve("");
        },
        requestTimeout: 0,
        retryDelay: 0,
        url: `${BIC_APP_API_DEV_URL}/v1/wallet`
    });
    return signer;
}


export class MockSigner implements ISigner {
    private _account: PrivateKeyAccount;

    constructor(privateKey: Hex) { 
        this._account = privateKeyToAccount(privateKey);
    }

    get address() {
        return this._account.address;
    };
    
    public getAccount(): IAccount | undefined {
        if (!this._account) {
            return undefined;
        }
        return {
            address: this._account.address,
            sign: async ({ hash }: any): Promise<`0x${string}`> => {
                if (!this._account.sign) {
                    throw new Error("sign method is not defined.");
                }
                return this._account.sign({ hash });
            },
            signMessage: async (message: string | Uint8Array): Promise<`0x${string}`> => {
                if (!this._account.sign) {
                    throw new Error("sign method is not defined.");
                }
                const hash = message as Hex; // Assuming message is already a hash
                return this._account.sign({ hash });
            },

        };
    }

    public async getSystemOwnerAddress(): Promise<string> {
        return this._account.address;
    }

    public startSession(accessToken: string) {
        throw new Error("Method not implemented.");

    }

    public getWalletInfo<T = { userId: string; status: any; address: string; }>(): Promise<T> {
        throw new Error("Method not implemented.");
    }

    public async init(password: string, recoveryCode: string) {
        throw new Error("Method not implemented.");
    }

    public async login(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public logout(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public async signMessage(message: string | Uint8Array): Promise<Hex> {
        if (!this._account) {
            throw new Error("Account is not initialized.");
        }
        if (!this._account.sign) {
            throw new Error("sign method is not defined.");
        }
        const signature = await this._account.sign({ hash: message as Hex });
        return signature;
    }

    public async getAddress(): Promise<string> {
        return this._account.address;
    }

    public getViemAccount() {
        return this._account;
    }

    public isExistedDeviceShare(userId: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}