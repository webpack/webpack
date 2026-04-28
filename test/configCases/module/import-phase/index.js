it("should allow to match rules by import phase", async () => {
	const evaluation = await import("./module.js");
	const deferred = await import.defer("./module.js");

	expect(evaluation.default).toBe("evaluation");
	expect(deferred.default).toBe("defer");

	// Source-phase imports for JavaScript modules are not supported per the
	// TC39 source-phase imports proposal — `GetModuleSource` of a
	// SourceTextModule throws a `SyntaxError`.
	await expect(import.source("./module.js")).rejects.toBeInstanceOf(SyntaxError);
});
