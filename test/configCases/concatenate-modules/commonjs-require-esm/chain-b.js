import { deepen, depth } from "./chain-c.js";

global.__chainOrder = (global.__chainOrder || []).concat("chain-b");

export const depthFromC = depth;

export function deepenFromB() {
	return deepen();
}
