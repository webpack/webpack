it("should allow functions as externals with promise and resolver", function () {
	const result = require("external");
	expect(result.relativePath).toMatch(/^[a-z]:\\|\//i);
	expect(result.relativePath).toMatch(/resolve.node_modules.external\.js$/);
});
