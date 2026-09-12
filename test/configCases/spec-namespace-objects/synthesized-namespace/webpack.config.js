"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.js$/, parser: { specNamespaceObject: true } }]
	}
};
