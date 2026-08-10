import source wasmModule from "./wasm.wat?source";

export const run = () => new WebAssembly.Instance(wasmModule);
