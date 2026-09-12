"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { environment: { arrowFunction: false } },
	module: {
		rules: [{ test: /m\.js$/, parser: { specNamespaceObject: true } }]
	}
};
