"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	experiments: { css: true },
	output: {
		publicPath: "auto",
		filename: "[name].js",
		environment: {
			arrowFunction: false,
			const: false,
			forOf: false,
			optionalChaining: false
		}
	}
};
