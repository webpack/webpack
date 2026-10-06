"use strict";

const path = require("path");
const webpack = require("../../../../");
const data = require("./data");

/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		data: `commonjs ${path.resolve(__dirname, "data.js")}`
	},
	plugins: [
		new webpack.ProgressPlugin({
			entries: true,
			modules: true,
			dependencies: true,
			activeModules: true,
			handler: (value, ...messages) => {
				data.push({ value, messages });
			}
		})
	]
};
