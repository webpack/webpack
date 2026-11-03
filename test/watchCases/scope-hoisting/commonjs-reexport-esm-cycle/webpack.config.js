"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		concatenateModules: { commonjs: true },
		mangleExports: "deterministic",
		minimize: false
	}
};
