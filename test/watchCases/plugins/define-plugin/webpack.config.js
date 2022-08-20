const path = require("path");
const fs = require("fs");
const webpack = require("../../../../");
/** @type {function(any, any): import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => {
	const valueFile = path.resolve(srcPath, "value.txt");
	return {
		plugins: [
			new webpack.DefinePlugin({
				TEST_VALUE: webpack.DefinePlugin.runtimeValue(() => {
					return JSON.stringify(fs.readFileSync(valueFile, "utf-8").trim());
				}, [valueFile]),
				TEST_VALUE2: webpack.DefinePlugin.runtimeValue(() => {
					return JSON.stringify(fs.readFileSync(valueFile, "utf-8").trim());
				}, []),
				TEST_VALUE3: webpack.DefinePlugin.runtimeValue(() => {
					return JSON.stringify(fs.readFileSync(valueFile, "utf-8").trim());
				}, true),
				TEST_VALUE4: webpack.DefinePlugin.runtimeValue(
					() => {
						return JSON.stringify(fs.readFileSync(valueFile, "utf-8").trim());
					},
					{
						fileDependencies: [valueFile]
					}
				),
				TEST_VALUE5: webpack.DefinePlugin.runtimeValue(
					({ version, key }) => {
						return JSON.stringify({ version, key });
					},
					{
						version: () => fs.readFileSync(valueFile, "utf-8").trim()
					}
				)
			})
		]
	};
};
