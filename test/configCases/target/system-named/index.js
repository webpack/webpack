/* This test verifies that when output.library is specified that the compiled bundle provides
* the library name to System during the System.register
*/

afterEach(function(done) {
	delete global.System;
	done()
})

it("should call System.register with a name", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	expect(source).toMatch(/.*System\.register\("named-system-module", \[[^\]]*\]/);
});