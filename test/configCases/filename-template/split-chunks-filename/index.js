it("should create a vendor file", function() {
	var fs = require("fs");
	var path = require("path");
	if (!fs.existsSync(path.join(__dirname, "vendor.js")))
		throw new Error("vendor.js file was not created");
});

require.include("test");
