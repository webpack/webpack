import { fromB } from "./cycle-b.js";

globalThis.crossChunkInitEffects.push("cycle-a");

export function fromA() {
	return "a";
}

export const both = () => fromA() + fromB();
