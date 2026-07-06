import { bumpDep } from "./dep.js";
import { bumpStar } from "./star-dep.js";

// Direct exports of every declaration kind, plus mutation forms.
export let mutLet = 0;
export var mutVar = 1;
export const constVal = "const";
export function fn() {
	return "fn";
}
export class Cls {
	value() {
		return "cls";
	}
}
export default function defFn() {
	return "def";
}
export { mutLet as aliased };

// Re-exports (live once concatenated into the entry).
export { depCount } from "./dep.js";
export * from "./star-dep.js";

export function mutate() {
	mutLet += 1;
	mutVar++;
	bumpDep();
	bumpStar();
}
