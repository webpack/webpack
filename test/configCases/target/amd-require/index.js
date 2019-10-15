it("should run", function() {});

it("should name require", function() {
	var fs = nodeRequire("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	expect(source).toMatch(/require\(\[[^\]]*\], (function)?\(/);
});
