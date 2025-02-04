import { getCreateWasmBicSignerFn } from "@beincom/signers/wasm";
import { BIC_APP_API_DEV_URL } from "./constants";

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
