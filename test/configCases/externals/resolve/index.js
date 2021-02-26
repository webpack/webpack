it("should allow functions as externals with promise and resolver", function () {
	const result = require("external");
	expect(result).toMatch(/^[a-z]:\\|\//i);
	expect(result).toMatch(/resolve.node_modules.external\.js$/);
});
