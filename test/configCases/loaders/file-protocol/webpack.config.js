"use strict";

const path = require("node:path");
const url = require("node:url");

const pathToLoader = url
	.pathToFileURL(path.resolve(__dirname, "./loader.js"))
	.toString();

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /a\.js$/,
				loader: pathToLoader
			},
			{
				test: /b\.js$/,
				use: pathToLoader
			}
		]
	}
};
