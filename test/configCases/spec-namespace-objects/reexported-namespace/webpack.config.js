"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /index\.js$/, parser: { specNamespaceObject: true } }]
	}
};
