import { mul } from "./pure-cjs";
import { helper } from "./refs-entry.js";

export function times(a, b) {
	return mul(a, b);
}

export function viaHelper(a) {
	return helper(a);
}
