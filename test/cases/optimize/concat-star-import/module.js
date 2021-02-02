import * as c from "cmodule";

export function foo() {
	// variable name matches the imported package name
	const cmodule = c([1, 2]);
	return cmodule + cmodule;
}
