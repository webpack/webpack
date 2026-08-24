"use strict";

const supportsObjectHasOwn = require("../../../helpers/supportsObjectHasOwn");

module.exports = {
	// The template does not downgrade `ecmaVersion` cases to the host, so the
	// newest variants emit `globalThis` and `Object.hasOwn` (Node 16.9). The
	// conformance check still reads every build.
	noTests: !supportsObjectHasOwn(),
	ecmaConformance: true,
	restrictEnvironment: true,
	findBundle(i, options) {
		return [`./${options.name}/lazy.js`, `./${options.name}/bundle.js`];
	}
};
