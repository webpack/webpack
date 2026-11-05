"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "media/[path][name][ext]",
		publicPath: "public/"
	},
	module: {
		rules: [
			{
				mimetype: "text/plain",
				type: "asset/resource"
			}
		]
	},
	target: "web"
};
