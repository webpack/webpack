import { externalValue as valueB, getOtherExternal as getB } from "./external-b.mjs";

export const externalValue = "external-A";

export function getOtherExternal() {
	return valueB;
}

// Re-export to test circular re-exports
export { getB as getOtherValue };
