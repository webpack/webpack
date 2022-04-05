const foo = Math.random() > 0.5 ? "a" : "b";
require(`./foo/${foo}.js`);

it("context module should use relative path in source map file", () => {
	var fs = require("fs");
	var source = fs.readFileSync(__filename + ".map", "utf-8");
	var map = JSON.parse(source);
	expect(map.sources).toContain("webpack:///./foo/ sync ^\\.\\/.*\\.js$");
});
