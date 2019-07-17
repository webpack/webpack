it("should allow to set custom resolving rules", function() {
	var a = require("./a");
	expect(a).toBe("ok-normal-wrong2");
	var b = require("./b");
	expect(b).toBe("ok-normal-wrong2-yes");
	var c = require("./c");
	expect(c).toBe("wrong-normal-ok2");
});
