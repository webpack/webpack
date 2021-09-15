it("should be able to compile a module with UMD", function() {
	var x = require("./module");
	expect(x.default).toBe(global);
});

it("should not find a free exports", function() {
	var x = require("./module2");
	if(typeof exports !== "undefined")
		expect(x.default).toBe(exports);
	else
		expect((x.default)).toBe(false);
});

export {}
