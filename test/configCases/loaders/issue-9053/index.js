it("should apply inline loaders before matchResource", function() {
	var foo = require("./a");

	expect(foo).toBe("d");
});
