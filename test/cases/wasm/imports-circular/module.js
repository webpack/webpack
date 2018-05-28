import { addNumber } from "./wasm.wasm";

export var result = addNumber(22);

export function getNumber() {
	return 20;
}
