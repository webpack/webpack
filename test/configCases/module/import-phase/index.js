it("should allow to match rules by import phase", async () => {
	const evaluation = await import("./module.js");
	const deferred = await import.defer("./module.js");
	const source = await import.source("./module.js");

	expect(evaluation.default).toBe("evaluation");
	expect(deferred.default).toBe("defer");
	// Source-phase imports of JavaScript modules return a `ModuleSource`
	// reflection per the TC39 source-phase imports proposal — an opaque
	// frozen object whose `Symbol.toStringTag` is `"Module"`.
	expect(typeof source).toBe("object");
	expect(source).not.toBeNull();
	expect(Object.prototype.toString.call(source)).toBe("[object Module]");
});
