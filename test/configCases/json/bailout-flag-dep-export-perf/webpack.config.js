"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		parser: {
			json: {
				exportsDepth: Infinity
			}
		}
	}
};
