"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [true, false].map((arrowFunction) => ({
	output: {
		library: { type: "commonjs2" },
		environment: { arrowFunction }
	},
	module: {
		parser: { javascript: { specNamespaceObject: true } }
	}
}));
