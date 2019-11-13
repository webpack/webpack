it("should pass custom options to a devtool plugin", function() {
	var fs = require("fs");
	var path = require("path");
	var exists = fs.existsSync(path.join(__dirname, 'custom.map'));
	expect(exists).toBe(true);
});
