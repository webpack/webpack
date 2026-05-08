"use strict";

const Module = require("module");
const path = require("path");

const nodeRequire = Module.createRequire(path.join(__dirname, "index.js"));

// Bare specifiers in this dynamic import resolve relative to test.config.js,
// which sits in the fixture directory — so Node.js's ESM resolver walks the
// fixture's node_modules and the "import" condition is what's active.
const nodeImport = (request) => import(request);

module.exports = {
	findBundle(_, options) {
		const ext = path.extname(options.output.filename);
		return `./bundle${ext}`;
	},
	moduleScope(scope) {
		scope.nodeRequire = nodeRequire;
		scope.nodeImport = nodeImport;
	}
};
