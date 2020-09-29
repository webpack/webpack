const path = require("path");
const fs = require("fs");
const webpack = require("../../../../");
const valueFile = path.resolve(
	__dirname,
	"../../../js/watch-src/plugins/define-plugin/value.txt"
);
/** @type {import("../../../../").Configuration} */
module.exports = {
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
			}, true)
		})
	]
};
