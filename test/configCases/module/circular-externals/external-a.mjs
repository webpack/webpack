import { externalValue as valueB } from "./external-b.mjs";

export const externalValue = "external-A";

export function getOtherExternal() {
	return valueB;
}
