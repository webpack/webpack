const fs = require("fs");
const path = require("path");

it("should externalize electron built-in modules as module-import with module output", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "externals.js"),
		"utf-8"
	);
	// ESM `import` keeps the configured `module-import` type
	expect(content).toContain(
		`import * as __WEBPACK_EXTERNAL_MODULE_electron__ from "electron";`
	);
	expect(content).toContain(
		`import * as __WEBPACK_EXTERNAL_MODULE_app__ from "app";`
	);
	// `require` still falls back to `node-commonjs` for compatibility
	expect(content).toContain(`__WEBPACK_EXTERNAL_createRequire_require("shell")`);
});
