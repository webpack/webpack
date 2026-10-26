"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: ["./index.js", "./page.html"]
	},
	output: {
		filename: "[name].js"
	},
	experiments: {
		html: true,
		css: true
	}
};
