import { getResult } from "./wasm.wasm";

export var result = getResult(1);

export function getNumber() {
	return 20;
}
