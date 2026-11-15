var c = require("./c");

it("indirect-reexport: should have the correct values", function() {
	expect(c.named).toBe("named");
});
