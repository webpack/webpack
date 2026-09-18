"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

const valueFile = path.resolve(__dirname, "async-value.txt");

// the same instance under two keys is resolved once, not once per key
const shared = webpack.DefinePlugin.runtimeValue(
	async () => JSON.stringify("shared-async"),
	[]
);

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.DefinePlugin({
			ASYNC_FILE_VALUE: webpack.DefinePlugin.runtimeValue(
				async ({ module, key, version }) => {
					const text = (await fs.promises.readFile(valueFile, "utf8")).trim();
					return JSON.stringify({
						file: text,
						key,
						version,
						hasModule: module !== undefined
					});
				},
				{
					fileDependencies: [valueFile]
				}
			),
			ASYNC_OBJECT: {
				nested: webpack.DefinePlugin.runtimeValue(
					async () => JSON.stringify("nested-async"),
					[]
				)
			},
			ASYNC_PARALLEL: webpack.DefinePlugin.runtimeValue(
				async ({ key, version }) => {
					await new Promise((resolve) => {
						setTimeout(resolve, 10);
					});
					return JSON.stringify({ key, version });
				},
				{ version: "custom-version" }
			)
		}),
		new webpack.DefinePlugin({
			ASYNC_SHARED_A: shared,
			ASYNC_SHARED_B: shared
		})
	]
};
