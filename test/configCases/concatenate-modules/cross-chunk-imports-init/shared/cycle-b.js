import { fromA } from "./cycle-a.js";

globalThis.crossChunkInitEffects.push("cycle-b");

export function fromB() {
	return "b";
}

// cycle-a's body hasn't run yet, but its function declarations have
export const viaA = fromA();
