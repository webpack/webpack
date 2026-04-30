"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Record<string, EXPECTED_ANY>, argv: { srcPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => {
	const additionalFile = path.join(srcPath, "additional.txt");
	const additionalDir = path.join(srcPath, "additional-dir");
	return {
		plugins: [
			new webpack.DefinePlugin({
				ADDITIONAL_FILE_CONTENT: webpack.DefinePlugin.runtimeValue(
					() => JSON.stringify(fs.readFileSync(additionalFile, "utf8").trim()),
					true
				),
				ADDITIONAL_DIR_FILES: webpack.DefinePlugin.runtimeValue(
					() => JSON.stringify(fs.readdirSync(additionalDir).sort()),
					true
				)
			})
		],
		watchOptions: {
			additional: [additionalFile, additionalDir]
		}
	};
};
