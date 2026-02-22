"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const outputPath = options.output.path;
		const bundlePath = path.join(outputPath, "bundle0.mjs");
		// When entry has no exports, we must not emit redundant "var __webpack_exports__ = {};"
		const content = fs.readFileSync(bundlePath, "utf8");
		expect(content).not.toMatch(/var __webpack_exports__ = \{\};/);
	}
};
