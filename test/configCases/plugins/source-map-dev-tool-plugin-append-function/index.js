it("should have [file] replaced with chunk filename in append", function() {
	const fs = require("fs"),
			path = require("path");
	const source = fs.readFileSync(path.join(__dirname, "some-test.js"), "utf-8");
	expect(source).toMatch("//# sourceMappingURL=http://localhost:50505/some-test.js.map");
});
