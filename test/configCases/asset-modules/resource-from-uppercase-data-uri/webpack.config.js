"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
