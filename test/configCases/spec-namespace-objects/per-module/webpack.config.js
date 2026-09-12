"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /spec\.js$/, parser: { specNamespaceObject: true } }]
	}
};
