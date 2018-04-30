require("should");
it("should assign different names to the same module with different issuers ", function() {
	var fs = require("fs");
	var path = require("path");
	var bundle = fs.readFileSync(path.join(__dirname, "main.js"), "utf-8");
	bundle.should.match(/\.\/c\.js\?\w{4}/g);
	require("./a").should.be.equal("loader-a");
	require("./b").should.be.equal("loader-b");
});
