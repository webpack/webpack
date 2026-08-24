"use strict";

const supportsObjectHasOwn = require("../../../helpers/supportsObjectHasOwn");

module.exports = {
	// `ecmaVersion` cases are not downgraded to the host, so the newest variants
	// need Node 16.9 to run. The conformance check still reads every build.
	noTests: !supportsObjectHasOwn(),
	ecmaConformance: true,
	restrictEnvironment: true,
	findBundle(i, options) {
		return [`./${options.name}/lazy.js`, `./${options.name}/bundle.js`];
	}
};
