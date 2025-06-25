"use strict";
// ESM module already with "use strict"
// This should NOT trigger a warning

export const esmStrictValue = 42;

export function test() {
	return "esm with strict";
}