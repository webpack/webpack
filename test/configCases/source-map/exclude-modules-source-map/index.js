it("bundle1 should include eval sourcemapped test1.js and test2.js as is", function() {
	var fs = require("fs");
	var path = require("path");
	var bundle1 = fs.readFileSync(path.join(__dirname, "bundle1.js"), "utf-8");
	expect(bundle1).toMatch("eval(\"var test1marker");
	expect(bundle1).toMatch("var test2marker");
	expect(bundle1).not.toMatch("eval(\"var test2marker");
});
