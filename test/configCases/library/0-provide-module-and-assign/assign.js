import { dep } from "./dep.js";
export const bee = `b-${dep}`;
export function shout() {
	return bee.toUpperCase();
}
