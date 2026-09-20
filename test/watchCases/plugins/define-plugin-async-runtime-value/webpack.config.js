"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

const { DefinePlugin } = webpack;

/**
 * @param {string} file the file to read
 * @returns {Promise<string>} its trimmed content
 */
const readFile = (file) =>
	new Promise((resolve, reject) => {
		fs.readFile(file, "utf8", (err, content) => {
			if (err) reject(err);
			else resolve(content.trim());
		});
	});

/** @type {(env: Env, options: TestOptions) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => {
	const valueFile = path.resolve(srcPath, "value.txt");
	return {
		plugins: [
			new DefinePlugin({
				TEST_VALUE: DefinePlugin.runtimeValue(
					async () => JSON.stringify(await readFile(valueFile)),
					[valueFile]
				),
				TEST_VALUE2: DefinePlugin.runtimeValue(
					async () => JSON.stringify(await readFile(valueFile)),
					[]
				),
				TEST_VALUE3: DefinePlugin.runtimeValue(
					async () => JSON.stringify(await readFile(valueFile)),
					true
				),
				TEST_VALUE4: DefinePlugin.runtimeValue(
					async ({ version, key }) => JSON.stringify({ version, key }),
					{
						version: () => fs.readFileSync(valueFile, "utf8").trim()
					}
				)
			})
		]
	};
};
