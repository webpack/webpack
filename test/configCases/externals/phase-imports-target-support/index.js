"use strict";

const fs = require("fs");
const path = require("path");

const emitted = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should emit both phases natively for the deno target", () => {
	const content = emitted("deno-phases.mjs");

	expect(content).toMatch(
		/import defer \* as __WEBPACK_EXTERNAL_MODULE_ext_defer\w* from "ext-defer";/
	);
	expect(content).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_source\w* from "ext-source";/
	);
});

it("should hand a dynamic source phase the namespace shape consumers unwrap", () => {
	const content = emitted("deno-phases.mjs");

	expect(content).toContain('import.defer("ext-import-defer")');
	expect(content).toMatch(
		/import\.source\("ext-import-source"\)\.then\(\(m\) => \(\{ "default": m \}\)\)/
	);
});

it("should keep an unused source binding out of the eager form", () => {
	const content = emitted("concat-phases.mjs");

	// `import "ext-source"` here would evaluate the module the phase asked to keep unevaluated.
	expect(content).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_source\w* from "ext-source";/
	);
	expect(content).not.toContain('import "ext-source"');
});

it("should keep one request imported in two phases as two imports", () => {
	for (const name of ["deno-phases.mjs", "concat-phases.mjs"]) {
		const content = emitted(name);

		expect(content).toMatch(/import defer \* as \w+ from "ext-both";/);
		expect(content).toMatch(/import source \w+ from "ext-both";/);
	}
});

it("should emit the source phase natively for the node target", () => {
	expect(emitted("node-phases.mjs")).toMatch(
		/import source __WEBPACK_EXTERNAL_MODULE_ext_source\w* from "ext-source";/
	);
});
