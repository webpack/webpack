it("should allow to set custom resolving rules", function() {
	var a = require("./a");
	expect(a).toBe("ok");
	var b = require("./b");
	expect(b).toBe("wrong");
});
