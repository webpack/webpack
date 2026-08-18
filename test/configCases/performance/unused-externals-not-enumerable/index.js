const path = require("path");

it("should stay quiet when nothing in externals can be named", () => {
	expect(typeof path.join).toBe("function");
});
