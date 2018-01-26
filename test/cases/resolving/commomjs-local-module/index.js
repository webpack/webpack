define("regular", function(require, exports, module) {
	module.exports = "regular-module";
});

define("override-exports", function(require, exports, module) {
	exports = "this one overrides exports reference";
});

define("return-module", function(require, exports, module) {
	return "module is returned";
});


it("should make different modules for query", function() {
	expect(require("regular")).toBe("regular-module");
	expect(require("return-module")).toBe("module is returned");

	const overrideExports = require("override-exports");
	expect(overrideExports).to.be.a.Object();
	expect(Object.keys(overrideExports).length).to.be.exactly(0);
});
