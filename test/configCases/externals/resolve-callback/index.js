it("should allow functions as externals with promise and resolver", function () {
	const result = require("external");
	expect(result).toMatch(/^[a-z]:\\|\//i);
	expect(result).toMatch(/resolve-callback.node_modules.external\.js$/);
	const result1 = require("external-false");
	expect(JSON.stringify(result1)).toBe('{}');
});
