"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// A concatenated importer renders namespace access itself, so it does not
	// consult the option yet; this case is about which module the option reads.
	optimization: { concatenateModules: false },
	module: {
		rules: [{ test: /spec\.js$/, parser: { specNamespaceObject: true } }]
	}
};
