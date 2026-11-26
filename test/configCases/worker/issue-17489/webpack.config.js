"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	optimization: {
		innerGraph: true
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				parser: {
					worker: ["*audioContext.audioWorklet.addModule()", "..."]
				}
			}
		]
	}
};
