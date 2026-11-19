"use strict";

const path = require("path");
const {
	experiments: {
		schemes: { HttpUriPlugin }
	}
} = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration[]} */
module.exports = (env, { testPath }) => [
	{
		name: "regexp",
		mode: "development",
		plugins: [
			new HttpUriPlugin({
				// written at run time, so each config suite keeps its own
				lockfileLocation: path.join(testPath, "regexp.webpack.lock"),
				allowedUris: [/^http:\/\/localhost:9992/],
				upgrade: false,
				frozen: false,
				cacheLocation: false
			})
		]
	},
	{
		name: "function",
		mode: "development",
		plugins: [
			new HttpUriPlugin({
				// written at run time, so each config suite keeps its own
				lockfileLocation: path.join(testPath, "function.webpack.lock"),
				allowedUris: [(uri) => uri.startsWith("http://localhost:9992")],
				upgrade: false,
				frozen: false,
				cacheLocation: false
			})
		]
	}
];
