it("should allow to set custom resolving rules", function() {
	var a = require("./a");
	expect(a).toBe("ok-normal-ok2");
	var b = require("./b");
	expect(b).toBe("ok-normal-ok2-yes");
	var c = require("./c");
	expect(c).toBe("wrong-normal-ok2");
});
