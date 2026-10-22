var c = require("./c");

it("reexport-exposed-default-cjs: should have the correct values", function() {
	expect(c.default).toBe("default");
});
