"use strict";

const fs = require("fs");
const path = require("path");

it("should generate runtime code for source-phase imports of externals", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "bundle.js"),
		"utf-8"
	);

	// The init-fragment key for source-phase imports is `source harmony import`,
	// distinct from the regular `harmony import` key. The dependency template
	// itself currently emits the same import statement as a regular harmony
	// import (the source phase is not specially materialised for non-WASM
	// externals at the static import site), but the keying ensures the import
	// is still tracked separately from any eager namespace import of the same
	// module.
	expect(content).toContain(
		"/* harmony import */ var ext_var_sync__WEBPACK_IMPORTED_MODULE"
	);
	expect(content).toContain(
		"/* harmony import */ var ext_promise_async__WEBPACK_IMPORTED_MODULE"
	);

	// Source-phase static imports must not be lowered to the deferred runtime
	// helper.
	expect(content).not.toContain("__webpack_require__.zO(");
});
