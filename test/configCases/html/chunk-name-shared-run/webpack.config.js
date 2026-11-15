"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		main: "./index.js",
		a: "./a.html",
		b: "./b.html"
	},
	output: { filename: "[name].js", htmlFilename: "[name].html" },
	experiments: { html: true }
};
