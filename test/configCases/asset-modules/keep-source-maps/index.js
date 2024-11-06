it("should write asset file to output directory", function() {
	const fs = require("fs");
	const path = require("path");
	const source = fs.readFileSync(path.join(__dirname, "asset.css"), "utf-8");
	expect(source).toMatch("/*# sourceMappingURL=asset.css.map*/");
});

it("should write sourcemap file relative to fileContext", function() {
	const fs = require("fs");
	const	path = require("path");
	expect(fs.existsSync(path.join(__dirname, "asset.css.map"))).toBe(true);
	const source = JSON.parse(fs.readFileSync(path.join(__dirname, "asset.css.map"), "utf-8"));
	expect(source.sources[0]).toBe("webpack:///asset.scss");
	expect(source.sources[1]).toBe("data:;charset=utf-8,@import%20%22base%22;%0A%0Aa%20%7B%0A%20%20color:%20red;%0A%7D%0A");
	expect(source.sources[2]).toBe("http://example.com/index.js.map");
	expect(source.sources[3]).toBe('https://example.com/index.js.map');
});
