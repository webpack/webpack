it("should run", function() {
	var a = require("./a");
	var b = require("./b");
	expect(a).toBe("a");
	expect(b).toBe("b");
});
