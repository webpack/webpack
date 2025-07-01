import { valueB } from "./module-b.js";
import { externalValue } from "external-module-a";

export const valueA = "module-A";

export function getFromExternalA() {
	return externalValue;
}

export function callB() {
	return valueB;
}
