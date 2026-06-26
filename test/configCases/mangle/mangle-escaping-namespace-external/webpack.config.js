"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	optimization: {
		usedExports: true,
		providedExports: true,
		mangleExports: true,
		concatenateModules: true,
		minimize: false
	}
};
