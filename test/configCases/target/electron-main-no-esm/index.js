const fs = require("fs");
const path = require("path");

it("should externalize electron built-ins as node-commonjs when ESM is unsupported", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "externals.mjs"),
		"utf-8"
	);
	// electron 10 has no ESM, so built-ins must be required, not imported
	expect(content).not.toContain(`from "electron"`);
	expect(content).toContain(`__WEBPACK_EXTERNAL_createRequire_require("electron")`);
	expect(content).toContain(`__WEBPACK_EXTERNAL_createRequire_require("app")`);
});
