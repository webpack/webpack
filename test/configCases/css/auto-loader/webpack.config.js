"use strict";

const path = require("path");

// A loader is registered for `.css`, but `experiments.css` is left at its "auto"
// default → the built-in CSS type stays off so the loader keeps handling the file.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [path.resolve(__dirname, "loader.js")]
			}
		]
	}
};
