import { valueA } from "./module-a.js";
import { externalValue } from "external-module-b";

export const valueB = "module-B";

export function getFromExternalB() {
	return externalValue;
}

export function callA() {
	return valueA;
}
