import { getResult } from "./wasm.wasm";

export var result = getResult();

export function getNumber() {
	return 20;
}
