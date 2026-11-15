it("should run", function() {});

it("should pass an empty dependency array to define", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	// Without it, loaders such as Dojo scan the factory text for require("...")
	expect(source).toMatch(/define\(\[\], (function)?\(/);
});
