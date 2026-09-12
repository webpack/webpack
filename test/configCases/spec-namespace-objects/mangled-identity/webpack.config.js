"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: { usedExports: true, mangleExports: true },
	module: {
		rules: [{ test: /m\.js$/, parser: { specNamespaceObject: true } }]
	}
};
