it("should assign different names to the same module with different issuers ", function() {
	var fs = require("fs");
	var path = require("path");
	var bundle = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	bundle.should.containEql("./a.js~./c.js");
	bundle.should.containEql("./a.js~./c.js");
});
