import * as ns from "./enums";

// Tracked destructuring of the same module whose namespace also escapes.
export function read() {
	const { ENUM_B } = ns;
	return ENUM_B;
}
