"use strict";

const fs = require("fs");
const path = require("path");

const bundle = path.resolve(__dirname, "bundle.js");

it("should emit native `import defer` / `import source` for `module` externals", () => {
	const content = fs.readFileSync(bundle, "utf-8");

	expect(content).toMatch(
		/import defer \* as __WEBPACK_EXTERNAL_MODULE_ext_mod_defer\w* from "ext-mod-defer";/
	);
	expect(content).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_mod_source\w* from "ext-mod-source";/
	);
});

it("should emit `import.defer` / `import.source` for `import` externals", () => {
	const content = fs.readFileSync(bundle, "utf-8");

	expect(content).toContain('import.defer("ext-import-defer")');
	expect(content).toContain('import.source("ext-import-source")');
});

it("should emit native `import defer` / `import source` for `module-import` externals at static sites", () => {
	const content = fs.readFileSync(bundle, "utf-8");

	expect(content).toMatch(
		/import defer \* as __WEBPACK_EXTERNAL_MODULE_ext_mi_defer_static\w* from "ext-mi-defer-static";/
	);
	expect(content).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_mi_source_static\w* from "ext-mi-source-static";/
	);
});

it("should emit `import.defer` / `import.source` for `module-import` externals at dynamic sites", () => {
	const content = fs.readFileSync(bundle, "utf-8");

	expect(content).toContain('import.defer("ext-mi-defer-dynamic")');
	expect(content).toContain('import.source("ext-mi-source-dynamic")');
});

it("should not collapse the same external imported with two different phases", () => {
	const content = fs.readFileSync(bundle, "utf-8");

	// Both phase forms must appear — a single ExternalModule per (request,
	// phase) means both `import defer * as …` and `import source … from …`
	// statements are emitted for the same request.
	expect(content).toMatch(
		/import defer \* as __WEBPACK_EXTERNAL_MODULE_ext_both_phases\w* from "ext-both-phases";/
	);
	expect(content).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_both_phases\w* from "ext-both-phases";/
	);
});
