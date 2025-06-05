const fs = require("fs");
const path = require("path");

import "./index.css";

it("should compile successfully and generate source map", function () {
	const source = fs.readFileSync(__filename, "utf-8");
	const sourceMap = fs.readFileSync(__filename + ".test.map", "utf-8");
	const map = JSON.parse(sourceMap);

	// publicPath: "https://test.cases/"
	const publicPath = "https://test.cases/";

	// filename: "[file].test.map"
	const sourceMapUrl = publicPath + "bundle0.js.test.map";

	// append: "\n//# test-sourceMappingURL=[url]"
	expect(source).toContain(`//# test-sourceMappingURL=${sourceMapUrl}`);

	// namespace: "webpackTest"
	expect(
		map.sources.every(source => source.startsWith("webpack://webpackTest"))
	).toBe(true);

	// columns: false
	expect(map.mappings.includes(",")).toBe(false);

	// sourceRoot: "/src/"
	expect(map.sourceRoot).toBe("/src/");

	// debugIds: true
	expect(map.debugId).toBeDefined();
	expect(
		/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(
			map.debugId
		)
	).toBe(true);
	expect(source).toContain(`//# debugId=${map.debugId}`);

	// include: /.js$/
	expect(() => {
		fs.readFileSync(path.join(__dirname, "./bundle0.css.test.map"));
	}).toThrow();

	// noSources: true
	expect(map.sourcesContent).toBe(undefined);
});
