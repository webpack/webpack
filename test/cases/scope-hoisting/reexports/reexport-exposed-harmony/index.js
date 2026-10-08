var c = require("./c");

it("reexport-exposed-harmony: should have the correct values", function() {
	expect(c.named).toBe("named");
});
