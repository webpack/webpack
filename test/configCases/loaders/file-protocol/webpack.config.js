"use strict";

const path = require("path");
const url = require("url");

/** @import { Configuration } from "../../../../" */

const pathToLoader = url
	.pathToFileURL(path.resolve(__dirname, "./loader.js"))
	.toString();

/** @type {Configuration} */
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
