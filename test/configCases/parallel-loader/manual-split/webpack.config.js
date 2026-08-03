"use strict";

const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		parallel: { loader: { workers: 1, poolTimeout: 0 } }
	},
	module: {
		rules: [
			{
				test: /a\.js$/,
				// only the loaders after the hand-placed parallel loader go to the
				// pool, so `main-thread-loader` keeps its access to `emitFile`
				use: [
					"./main-thread-loader",
					webpack.experiments.parallel.loader,
					"./worker-loader"
				]
			}
		]
	}
};
