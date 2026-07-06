import source wasmModule from "./wasm.wat";

export function run() {
	return new WebAssembly.Instance(wasmModule).exports.getNumber();
}
