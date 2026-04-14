"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		basic: "./basic.js",
		one: "./one.css",
		two: "./two.css",
		three: "./three.css",
		four: "./four.css",
		five: "./five.css",
		common: "./commonjs.js",
		six: { import: "./six.js", dependOn: "common" }
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		css: true
	}
};
