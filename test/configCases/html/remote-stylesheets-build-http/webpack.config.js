"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "es2015"],
	entry: { main: "./index.js", page: "./page.html" },
	node: { __dirname: false, __filename: false },
	externalsPresets: { node: true },
	output: {
		filename: "[name].js",
		cssFilename: "[name].css"
	},
	optimization: { minimize: false },
	experiments: {
		html: true,
		css: true,
		buildHttp: {
			allowedUris: ["https://raw.githubusercontent.com/webpack/webpack/"],
			frozen: true,
			lockfileLocation: path.resolve(
				__dirname,
				"../../css/build-http/lock-files/lock.json"
			),
			cacheLocation: path.resolve(
				__dirname,
				"../../css/build-http/lock-files/test"
			)
		}
	}
};
