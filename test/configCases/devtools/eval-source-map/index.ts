it("should not include sourcesContent if noSources option is used", function() {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	var match = /\/\/# sourceMappingURL\s*=\s*data:application\/json;charset=utf-8;base64,(.*)\\n\/\/#/.exec(source);
	var mapString = Buffer.from(match[1], 'base64').toString('utf-8');
	var map = JSON.parse(mapString);
	expect(map).toHaveProperty("sourcesContent");
	expect(/\.ts(\?.+)?$/.test(map.file)).toBe(true);
});

if (Math.random() < 0) require("./test.js");
