import { bump } from "./dep.js";

// Concatenated into the entry, so `topLevelDeclarations` for the inlined
// module-library entry is resolved from the code generation results.
export let value = 0;

export function mutate() {
	value += 1;
	bump();
}
