require.include("external1");
require.ensure([], function() {
	require.include("external2");
})

it("should have externals in main file", function() {
	var a = require("./a");
	expect(a.vendor).toMatch("require(\"external0\")");
	expect(a.main).toMatch("require(\"external1\")");
	expect(a.main).toMatch("require(\"external2\")");
});
