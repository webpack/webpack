import source wasmModule from "./wasm.wat?1";

const { add, getNumber } = new WebAssembly.Instance(wasmModule).exports;

export function run() {
	return add(getNumber(), 2);
}
