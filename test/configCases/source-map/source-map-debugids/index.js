it("source should include debug id that matches debugId key in sourcemap", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	var sourceMap = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(sourceMap);
	expect(map.debugId).toBeDefined();
	expect(source).toContain(`//# debugId=${map.debugId}`);
});

