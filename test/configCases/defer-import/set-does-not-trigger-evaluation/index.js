import defer * as ns from "./dep.js";

it("does not evaluate the deferred module on `import defer`", () => {
	expect(globalThis.evaluations).toBe(undefined);
});

it("does not evaluate when assigning to an exported namespace property", () => {
	// Per the TC39 import-defer spec, `[[Set]]` on a Module Namespace
	// Exotic Object returns false without triggering evaluation.
	expect(() => {
		"use strict";

		ns.exported = "ignored";
	}).toThrow(TypeError);
	expect(globalThis.evaluations).toBe(undefined);
});

it("does not evaluate when assigning to a non-exported namespace property", () => {
	expect(() => {
		"use strict";

		ns.notExported = "ignored";
	}).toThrow(TypeError);
	expect(globalThis.evaluations).toBe(undefined);
});

it("evaluates when reading a property", () => {
	expect(ns.exported).toBe(1);
	expect(globalThis.evaluations).toBe(1);
});
