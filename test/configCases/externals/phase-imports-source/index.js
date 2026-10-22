"use strict";

const fs = require("fs");
const path = require("path");

it("should generate runtime code for source-phase imports of externals", () => {
	const content = fs.readFileSync(
		path.resolve(__dirname, "bundle.js"),
		"utf-8"
	);

	// The init-fragment key for source-phase imports is `source harmony import`,
	// distinct from `harmony import`. The template emits the same statement today, but
	// the keying keeps it tracked apart from an eager namespace import of the module.
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
