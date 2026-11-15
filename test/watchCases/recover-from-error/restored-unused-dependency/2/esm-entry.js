import { a } from "./esm";
export { a };
export { a as b } from "./esm-other";
export function f() {
	return import("./esm-lazy");
}
