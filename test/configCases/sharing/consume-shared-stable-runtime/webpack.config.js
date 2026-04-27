"use strict";

const { ConsumeSharedPlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	output: {
		filename: "[name].js"
	},
	optimization: {
		moduleIds: "deterministic",
		runtimeChunk: "single",
		minimize: false
	},
	plugins: [
		new ConsumeSharedPlugin({
			consumes: {
				"./a": { eager: true },
				"./b": { eager: true },
				"./c": { eager: true },
				"./d": { eager: true }
			}
		})
	]
};
