import { value } from "./values.js";

/** @returns {number} twice the current value */
export function read() {
	return Math.max(value, value) + Math.min(value, value);
}
