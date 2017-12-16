import { add, getNumber } from "./wasm.wasm?1";

export function run() {
	return add(getNumber(), 2);
}
