let ok = false;

it("should not use mjs extension by default", () => {
	expect(ok).toBe(true);
});

it("should not have commonjs stuff available", function () {
	if (typeof module !== "undefined") {
		// If module is available
		expect(module).toHaveProperty("webpackTestSuiteModule"); // it must be the node.js module
	}
	if (typeof require !== "undefined") {
		// If require is available
		expect(require).toHaveProperty("webpackTestSuiteRequire"); // it must be the node.js require
	}
});

export function setOk() {
	ok = true;
}
