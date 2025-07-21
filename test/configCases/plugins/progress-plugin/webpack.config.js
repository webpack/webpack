"use strict";

const path = require("path");
const webpack = require("../../../../");
const data = require("./data");

/** @typedef {import("../../../../").ProgressPlugin} ProgressPlugin */

/** @type {import("../../../../").Configuration} */
module.exports = {
	externals: {
		data: `commonjs ${path.resolve(__dirname, "data.js")}`
	},
	plugins: [
		new webpack.ProgressPlugin((value, ...messages) => {
			data.push(messages.join("|"));
		}),
		{
			apply: (compiler) => {
				compiler.hooks.compilation.tap("CustomPlugin", (compilation) => {
					compilation.hooks.optimize.tap("CustomPlugin", () => {
						const reportProgress =
							/** @type {NonNullable<ReturnType<typeof webpack.ProgressPlugin['getReporter']>>} */
							(webpack.ProgressPlugin.getReporter(compiler));
						reportProgress(0, "custom category", "custom message");
					});
				});
			}
		}
	]
};
