import { addNumber } from "./wasm.wat";

export var result = addNumber(22);

export function getNumber() {
	return 20;
}
