import { getNumber } from "./wasm.wat";
import { addNumber } from "./wasm-import.wat";

export function run() {
	// getNumber() === 42 (no imports -> instantiateStreaming branch)
	// addNumber(20) === 20 + 22 (wasm imports wasm -> compileStreaming branch)
	return getNumber() + addNumber(20);
}
