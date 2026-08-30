import * as ns from "./dep.js";

it("should report the assignment rather than corrupt the binding", () => {
	expect(ns.a).toBe(1);
});

if (typeof globalThis.neverTrue !== "undefined") {
	ns = null;
}
