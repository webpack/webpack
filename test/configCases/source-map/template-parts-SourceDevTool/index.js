it("should resolve template variables in SourceMapDevToolPlugin append option", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	var match = /sourceMappingURL\s*=.*\?hash=([A-Fa-f0-9]{20})/.exec(source);
	console.log(match);
	expect(match.length).toBe(2);
});
