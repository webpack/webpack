it("should asset exist", function() {
	var fs = require("fs");
	expect(fs.existsSync(__dirname + "/foo.js")).toBe(true);
});
