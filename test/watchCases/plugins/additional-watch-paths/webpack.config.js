"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => ({
	mode: "development",
	devtool: false,
	watchOptions: {
		additional: [path.join(srcPath, "extra.txt")]
	},
	plugins: [
		new webpack.DefinePlugin({
			EXTRA: webpack.DefinePlugin.runtimeValue(
				() =>
					JSON.stringify(
						fs.readFileSync(path.join(srcPath, "extra.txt"), "utf8").trim()
					),
				true
			)
		})
	]
});
