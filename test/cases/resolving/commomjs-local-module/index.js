var should = require("should");

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
	should.strictEqual(require("regular"), "regular-module");
	should.strictEqual(require("return-module"), "module is returned");

	const overrideExports = require("override-exports");
	should(overrideExports).be.a.Object();
	should(Object.keys(overrideExports).length).be.exactly(0);
});
