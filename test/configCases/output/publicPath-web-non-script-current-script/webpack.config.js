"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		main: "./index.js",
		"inner/app": "./app.js",
		"inner/image": "./app.js"
	},
	output: { filename: "[name].js" }
};
