"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2020"],
	output: {
		libraryTarget: "commonjs-module"
	},
	externals: {
		"amd-external": "amd-async amd-module",
		"amd-prop-external": ["amd-async amd-module-obj", "sub"],
		"failing-amd-external": "amd-async failing-module"
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"var require = function (deps, onLoad, onError) {\n" +
				"\tsetTimeout(function () {\n" +
				'\t\tif (deps[0] === "failing-module") return onError(new Error("amd reject"));\n' +
				'\t\tif (deps[0] === "amd-module-obj") return onLoad({ sub: "subvalue" });\n' +
				"\t\tonLoad(42);\n" +
				"\t}, 10);\n" +
				"};\n"
		})
	]
};
