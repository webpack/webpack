it("should run", function() {});

it("should name define", function() {
	var fs = require("node:fs");
	var source = fs.readFileSync(__filename, "utf-8");

	expect(source).toMatch(/define\(\[[^\]]*\], (function)?\(/);
});
