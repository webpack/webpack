import { deepenFromB, depthFromC } from "./chain-b.js";

global.__chainOrder = (global.__chainOrder || []).concat("chain-a");

export const label = `a<-b<-c:${depthFromC}`;

export function deepenFromA() {
	return deepenFromB();
}
