import { a } from "./esm";
export { a };
export function f() {
	return import("./esm-lazy");
}
