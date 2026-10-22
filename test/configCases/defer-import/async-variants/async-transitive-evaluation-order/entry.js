import defer * as ns from "./dep.js";
import "./sibling.js";

export function force() {
	return ns.value;
}
