it("should allow to match rules by import phase", async () => {
	const evaluation = await import("./module.js");
	const deferred = await import.defer("./module.js");
	const source = await import.source("./module.js");

	expect(evaluation.default).toBe("evaluation");
	expect(deferred.default).toBe("defer");
	expect(source).toBe("source");
});
