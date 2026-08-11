import { getNumber } from "./wasm.wat";

// Duplicated into both chunks below, so the binary is referenced from two depths.
export const run = () => getNumber();
