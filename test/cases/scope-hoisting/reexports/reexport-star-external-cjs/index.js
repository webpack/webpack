var c = require("./c");

it("reexport-star-external-cjs: should have the correct values", function() {
	expect(c.named).toBe("named");
});
