"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [true, false].map((arrowFunction) => ({
	output: { environment: { arrowFunction } },
	module: {
		parser: { javascript: { specNamespaceObject: true } }
	}
}));
