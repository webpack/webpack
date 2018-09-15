it("creates source maps for .mjs output files by default", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	var match = /sourceMappingURL\s*=\s*(.*)/.exec(source);
	expect(match[1]).toBe("bundle0.mjs.map");
});
