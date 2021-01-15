import { add, getNumber } from "./wasm.wat?1";

export function run() {
	return add(getNumber(), 2);
}
