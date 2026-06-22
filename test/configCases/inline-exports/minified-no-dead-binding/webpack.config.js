"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		filename: "bundle.js",
		pathinfo: false
	},
	optimization: {
		// keep the module separate so the side-effect `require` call stays visible
		concatenateModules: false,
		moduleIds: "named",
		inlineExports: true,
		// rely on the default minifier to strip the now-dead import var binding
		minimize: true
	}
};
