"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Record<string, EXPECTED_ANY>, argv: { srcPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => {
	const dynamicDir = path.join(srcPath, "dynamic");
	return {
		plugins: [
			new webpack.DefinePlugin({
				DYNAMIC_ENTRIES: webpack.DefinePlugin.runtimeValue(() => {
					if (!fs.existsSync(dynamicDir)) return JSON.stringify([]);
					return JSON.stringify(
						fs
							.readdirSync(dynamicDir, { withFileTypes: true })
							.map((dirent) =>
								dirent.isDirectory() ? `${dirent.name}/` : dirent.name
							)
							.sort()
					);
				}, true)
			})
		],
		watchOptions: {
			additional: [path.join(dynamicDir, "*")]
		}
	};
};
