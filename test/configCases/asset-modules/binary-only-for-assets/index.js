import value from "./value.js";

it("should apply `module.generator` `binary: false` to an asset", () => {
	const fs = require("fs");
	const path = require("path");
	expect(fs.existsSync(path.join(__dirname, "asset.css.map"))).toBe(true);
	const map = JSON.parse(
		fs.readFileSync(path.join(__dirname, "asset.css.map"), "utf-8")
	);
	// a source only the loader's map names
	expect(map.sources).toContain("http://example.com/index.js.map");
});

it("should keep the loader's source map of a JavaScript module", () => {
	const fs = require("fs");
	const path = require("path");
	expect(value).toBe(42);
	const map = JSON.parse(
		fs.readFileSync(path.join(__dirname, "bundle0.js.map"), "utf-8")
	);
	expect(map.sources).toContain("webpack:///original-value.js");
});
