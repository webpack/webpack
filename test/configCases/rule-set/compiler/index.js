it("should match rule with compiler name", function() {
	var a = require("./a");
	expect(a).toBe("loader matched");
	var b = require("./b");
	expect(b).toBe("loader not matched");
});
