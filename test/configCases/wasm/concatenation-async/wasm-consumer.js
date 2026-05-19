import { add, getNumber } from "./wasm.wat";

export function calculate() {
	return add(getNumber(), 2);
}
