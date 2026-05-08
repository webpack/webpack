"use strict";

const fs = require("fs");
const path = require("path");

it("should emit static `import defer` / `import source` for module externals in ESM output", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "bundle.js"),
		"utf-8"
	);

	expect(content).toMatch(
		/import defer \* as __WEBPACK_EXTERNAL_MODULE_ext_defer\w* from "ext-defer";/
	);
	expect(content).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_source\w* from "ext-source";/
	);
});

it("should emit `import.defer` / `import.source` for dynamic phase imports of `import` externals", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "bundle.js"),
		"utf-8"
	);

	expect(content).toContain('import.defer("ext-import-defer")');
	expect(content).toContain('import.source("ext-import-source")');
});
