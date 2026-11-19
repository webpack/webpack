import { read } from "./a-cycle";

export const offset = 2;

/** @returns {number} the value read through the cycle */
export function value() {
	return read();
}
