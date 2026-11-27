"use strict";

const fs = require("fs");
const path = require("path");

/** @import { Configuration } from "../../../../" */

// The directory name can't be checked in, since Windows doesn't allow it.
const context = path.resolve(__dirname, "generated");
const dir = path.resolve(context, "data:text/html,");

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.resolve(dir, "image.png"), "<p>not an image</p>");

/** @type {Configuration} */
module.exports = {
	context,
	entry: path.resolve(__dirname, "index.js"),
	output: {
		assetModuleFilename: "[name].[hash:8][ext]"
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/resource"
			}
		]
	}
};
