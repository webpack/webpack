import source addWasmModule from "./add.wasm";
import source factorialWasmModule from "./factorial.wasm";
import source fibonacciWasmModule from "./fibonacci.wasm";

export const { add } = new WebAssembly.Instance(addWasmModule).exports;
export const { factorial } = new WebAssembly.Instance(factorialWasmModule).exports;
export const { fibonacci } = new WebAssembly.Instance(fibonacciWasmModule).exports;

export function factorialJavascript(i) {
	if (i < 1) return 1;
	return i * factorialJavascript(i - 1);
}

export function fibonacciJavascript(i) {
	if (i < 2) return 1;
	return fibonacciJavascript(i - 1) + fibonacciJavascript(i - 2);
}
