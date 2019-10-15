import await { getNumber } from "./wasm.wat?1";
import await { getNumber as getNumber2 } from "./wasm.wat?2";

export function run() {
	return getNumber() + getNumber2();
};
