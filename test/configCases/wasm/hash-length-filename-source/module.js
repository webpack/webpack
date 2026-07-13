import source wasmModule1 from "./wasm.wat?1";
import source wasmModule2 from "./wasm.wat?2";

const wasm1 = new WebAssembly.Instance(wasmModule1);
const wasm2 = new WebAssembly.Instance(wasmModule2);

export function run() {
	return wasm1.exports.getNumber() + wasm2.exports.getNumber();
}
