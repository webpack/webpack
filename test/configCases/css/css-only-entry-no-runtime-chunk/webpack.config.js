"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	entry: {
		main: "./index.js",
		styles: "./style.css"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: false
	},
	experiments: {
		css: true
	}
};
