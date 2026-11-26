"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "asset-[name][ext]",
		filename: "[name].js"
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				parser: {
					worklet: [
						"CSS.paintWorklet.addModule()",
						"*context.audioWorklet.addModule()",
						"*audioWorklet.addModule()",
						"..."
					]
				}
			}
		]
	}
};
