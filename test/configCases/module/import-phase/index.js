it("should allow to match rules by import phase", async () => {
	const evaluation = await import("./module.js");
	const deferred = await import.defer("./module.js");
	const source = await import.source("./module.js");

	expect(evaluation.default).toBe("evaluation");
	expect(deferred.default).toBe("defer");
	// Source-phase imports for JS modules return an opaque module reflection
	// (the source is not evaluated, so the phase-specific loader output is not
	// observable through the binding).
	expect(typeof source).toBe("object");
	expect(source).not.toBeNull();
	expect(Object.prototype.toString.call(source)).toBe("[object Module]");
});
