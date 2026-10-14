"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		broken: "./broken.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: { emitOnErrors: true },
	module: {
		// the entry matches the regexp first, so only broken.js reaches the glob
		noParse: [/index\.js$/, "[z-a].js"]
	}
};
