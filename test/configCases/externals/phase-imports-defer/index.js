"use strict";

const fs = require("fs");
const path = require("path");

const bundle = path.resolve(__dirname, "bundle.js");

it("should generate a deferred runtime import for a sync external", () => {
	const content = fs.readFileSync(bundle, "utf-8");

	expect(content).toContain(
		"/* deferred harmony import */ var ext_var_sync__WEBPACK_DEFERRED_IMPORTED_MODULE"
	);
	expect(content).toContain("__webpack_require__.zO(/*! ext-var-sync */");
});

it("should not defer an already-async external", () => {
	const content = fs.readFileSync(bundle, "utf-8");

	expect(content).toContain(
		"/* harmony import */ var ext_promise_async__WEBPACK_IMPORTED_MODULE"
	);
	expect(content).not.toContain(
		"/* deferred harmony import */ var ext_promise_async"
	);
	expect(content).not.toContain(
		"__webpack_require__.zO(/*! ext-promise-async */"
	);
});
