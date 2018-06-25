var fs = require("fs");

it("should contain export from replacement module", function() {
	var source = fs.readFileSync(__filename, "utf-8");
	expect(source).toMatch(/^const something = "bar";$/m);
});

require.include("./test.js");
