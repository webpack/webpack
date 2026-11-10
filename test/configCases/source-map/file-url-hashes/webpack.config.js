"use strict";

const path = require("path");
const { SourceMapDevToolPlugin } = require("../../../../");

/**
 * @param {undefined} env test environment
 * @param {{ testPath: string }} options test options
 * @returns {import("../../../../").Configuration[]} configurations
 */
module.exports = (env, { testPath }) =>
	["a", "b"].map((directory) => ({
		context: path.join(__dirname, directory),
		entry: "./entry file.js",
		target: "node",
		devtool: false,
		output: {
			path: path.join(testPath, directory),
			filename: "main.[contenthash].js"
		},
		node: { __dirname: false },
		module: {
			rules: [{ test: /entry file\.js$/, loader: require.resolve("./loader") }]
		},
		plugins: [
			new SourceMapDevToolPlugin({ filename: "[name].[contenthash].map" })
		]
	}));
