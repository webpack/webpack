import { add, getNumber } from "./wasm.wasm";

export function run() {
	return add(getNumber(), 2);
}
