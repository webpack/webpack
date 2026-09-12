"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /(m|inner)\.js$/, parser: { specNamespaceObject: true } }]
	}
};
