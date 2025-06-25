// ESM module without "use strict"
// This should trigger a warning

export const esmValue = 42;

export function test() {
	// This would fail in strict mode if we used arguments.callee
	return "esm module";
}