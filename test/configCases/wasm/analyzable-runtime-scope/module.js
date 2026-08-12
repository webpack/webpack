import { add, getNumber } from "./wasm.wat";

export const run = () => add(getNumber(), getNumber());
