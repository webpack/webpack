it("should ignore modules when the context matches", () => {
	let error;
	try {
		require("./folder/another-module");
	} catch (e) {
		error = e;
	}
	expect(error).toBeDefined();
	expect(error.message).toMatch(/Cannot find module/);

	// Should NOT ignore when context does not match
	const result = require("./ignored-sub-module");
	expect(result).toBe("visible");
});
