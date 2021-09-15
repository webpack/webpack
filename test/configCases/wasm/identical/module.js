import { getNumber } from "./wasm.wat?1";
import { getNumber as getNumber2 } from "./wasm.wat?2";

export function run() {
	return getNumber() + getNumber2();
}
