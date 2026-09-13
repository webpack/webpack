"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{ test: /m\.js$/, parser: { specNamespaceObject: true } },
			// Reading a name the module does not export is the subject here, and
			// webpack warns about each one, so leave that reporting to its own case.
			{ test: /index\.js$/, parser: { exportsPresence: false } }
		]
	}
};
