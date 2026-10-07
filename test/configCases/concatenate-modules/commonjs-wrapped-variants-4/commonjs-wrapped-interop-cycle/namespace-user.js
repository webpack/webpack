// the namespace import of a wrapped CJS member needs an ESM-interop variable
import * as ns from "./cycle-back";

export function read() {
	return ns.default;
}
