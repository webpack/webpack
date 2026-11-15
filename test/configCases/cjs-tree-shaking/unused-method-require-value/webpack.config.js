"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		minimize: false,
		moduleIds: "named",
		mangleExports: false,
		concatenateModules: false
	}
};
