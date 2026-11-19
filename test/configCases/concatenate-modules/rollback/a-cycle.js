import { value } from "./cycle";
import { offset } from "./b-cycle";

/** @returns {number} the value read through the cycle */
export function read() {
	return value + offset;
}
