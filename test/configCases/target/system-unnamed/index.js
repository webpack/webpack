/* This test verifies that when there is no output.library specified that the call to
* System.register does not include a name argument.
*/

afterEach(function(done) {
	delete global.System;
	done()
})

it("should call System.register without a name", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	expect(source).toMatch(/.*System\.register\(\[[^\]]*\], function\(__WEBPACK_DYNAMIC_EXPORT__\) {\s+(var .*;)?\s*return \{\s+setters: [^]+,[^]+execute: function\(\) {/);
});