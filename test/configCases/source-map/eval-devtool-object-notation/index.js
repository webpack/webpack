const fs = require("fs");

it("should compile successfully and generate source map", function () {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");

	expect(() => {
		fs.readFileSync(path.join(__dirname, "./bundle0.js.test.map"));
	}).toThrow();

	var match =
		/\/\/# sourceMappingURL\s*=\s*data:application\/json;charset=utf-8;base64,(.*)\\n\/\/#/.exec(
			source
		);
	var mapString = Buffer.from(match[1], "base64").toString("utf-8");
	var map = JSON.parse(mapString);

	expect(map).toHaveProperty("sourcesContent");
	expect(/\.js(\?.+)?$/.test(map.file)).toBe(true);

	let idx = source.lastIndexOf("eval(");
	// include eval() and skip the indexOf call on line 21
	expect(idx > -1 && source[idx - 1] !== '"').toBe(true);
});
