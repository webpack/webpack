"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		layers: true
	},
	entry: {
		main: {
			import: "./index.js",
			layer: "app"
		}
	},
	output: {
		filename: "bundle.js"
	},
	module: {
		rules: [
			{
				// a loader makes the entry re-runnable through the factory pipeline
				test: /index\.js$/,
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
