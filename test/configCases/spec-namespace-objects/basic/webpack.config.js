"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /m\.js$/, parser: { specNamespaceObject: true } }]
	}
};
