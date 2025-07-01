import { externalValue as valueA, getOtherExternal as getA } from "./external-a.mjs";

export const externalValue = "external-B";

export function getOtherExternal() {
	return valueA;
}

// Re-export to test circular re-exports
export { getA as getOtherValue };
