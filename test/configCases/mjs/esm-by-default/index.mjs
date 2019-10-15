let ok = false;

it("should not use mjs extension without the experiment", () => {
	expect(ok).toBe(true);
});

it("should have commonjs stuff available", function() {
	expect(module).toBeDefined();
	expect(module).not.toHaveProperty("webpackTestSuiteModule"); // it must not be the node.js module
});

export function setOk() {
	ok = true;
}
