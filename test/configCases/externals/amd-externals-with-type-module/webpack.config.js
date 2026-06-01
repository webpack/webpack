"use strict";

const webpack = require("../../../../");

module.exports = {
	entry: "./index.mjs",
	output: {
		libraryTarget: "amd"
	},
	externals: {
		"external-dependency": "amd external-dependency"
	},
	plugins: [
		new webpack.BannerPlugin({
			raw: true,
			banner:
				"function define(name, deps, fn) { if(typeof name !== 'string') { fn = deps; deps = name; name = null; } if(!Array.isArray(deps)) { fn = deps; deps = []; } fn.apply(null, deps.map(require)); }\n"
		})
	]
};
