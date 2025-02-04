const fs = require("fs");

it("should not include sourcesContent if noSources option is used", function() {
  const source = fs.readFileSync(__filename, "utf-8");
	const match = /\/\/# sourceMappingURL\s*=\s*data:application\/json;charset=utf-8;base64,(.*)\\n\/\/#/.exec(source);
	const mapString = Buffer.from(match[1], 'base64').toString('utf-8');
	const map = JSON.parse(mapString);
	expect(map).toHaveProperty("sourcesContent");
	expect(map).toHaveProperty("debugId");
	expect(
		/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(map.debugId)
	).toBe(true);
	expect(/\.js(\?.+)?$/.test(map.file)).toBe(true);
});

if (Math.random() < 0) require("./test.js");
