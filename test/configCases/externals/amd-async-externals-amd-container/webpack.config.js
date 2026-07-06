"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2020"],
	output: {
		libraryTarget: "commonjs-module",
		amdContainer: "amdLoader"
	},
	externals: {
		"amd-external": "amd-async amd-module"
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"var amdLoader = {\n" +
				"\trequire: function (deps, onLoad) {\n" +
				'\t\tsetTimeout(function () { onLoad("from-container:" + deps[0]); }, 10);\n' +
				"\t}\n" +
				"};\n"
		})
	]
};
