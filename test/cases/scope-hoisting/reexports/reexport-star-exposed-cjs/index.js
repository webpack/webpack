var c = require("./c");

it("reexport-star-exposed-cjs: should have the correct values", function() {
	expect(c.named).toBe("named");
});
