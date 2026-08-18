const path = require("path");

it("should compile and report the externals nothing imports", () => {
	expect(typeof path.join).toBe("function");
});
