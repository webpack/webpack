it("bundle1 should include eval sourcemapped test1.js and test2.js as is", function() {
	var fs = require("fs");
	var path = require("path");
	var bundle1 = fs.readFileSync(path.join(__dirname, "bundle1.js"), "utf-8");
	bundle1.should.containEql("eval(\"var test1marker");
	bundle1.should.containEql("var test2marker");
	bundle1.should.not.containEql("eval(\"var test2marker");
});
