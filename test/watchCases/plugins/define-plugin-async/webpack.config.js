"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => {
	const valueFile = path.resolve(srcPath, "value.txt");
	return {
		plugins: [
			new webpack.DefinePlugin({
				ASYNC_VALUE: webpack.DefinePlugin.runtimeValue(
					async () =>
						JSON.stringify(
							(await fs.promises.readFile(valueFile, "utf8")).trim()
						),
					[valueFile]
				),
				ASYNC_VALUE2: webpack.DefinePlugin.runtimeValue(
					async ({ key, version }) => JSON.stringify({ key, version }),
					{
						version: () => fs.readFileSync(valueFile, "utf8").trim()
					}
				)
			})
		]
	};
};
