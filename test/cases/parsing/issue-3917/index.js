it("should be able to compile a module with UMD", function() {
	var x = require("./module");
	expect(x.default).toEqual(global);
});

it("should not find a free exports", function() {
	var x = require("./module2");
	expect((x.default)).toEqual(exports);
});

export {}
