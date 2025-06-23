import { externalValue as valueA } from "./external-a.mjs";

export const externalValue = "external-B";

export function getOtherExternal() {
	return valueA;
}
