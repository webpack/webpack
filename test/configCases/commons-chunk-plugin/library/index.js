require("should");
require.include("external1");
require.ensure([], function() {
	require.include("external2");
})

it("should have externals in main file", function() {
	var a = require("./a");
	a.vendor.should.containEql("require(\"external0\")");
	a.main.should.containEql("require(\"external1\")");
	a.main.should.containEql("require(\"external2\")");
});
