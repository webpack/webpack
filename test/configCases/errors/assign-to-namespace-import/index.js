import * as ns from "./dep.js";

it("should report the assignment rather than corrupt the binding", () => {
	expect(ns.a).toBe(1);
});

// Never called: the parser reports the write without the bundle running it.
function assignToNamespace() {
	ns = null;
}
