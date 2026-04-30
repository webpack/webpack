"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {(env: Record<string, EXPECTED_ANY>, argv: { srcPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { srcPath }) => {
	const stylesDir = path.join(srcPath, "styles");
	return {
		plugins: [
			new webpack.DefinePlugin({
				MATCHED_FILES: webpack.DefinePlugin.runtimeValue(
					() =>
						JSON.stringify(
							fs
								.readdirSync(stylesDir)
								.filter((f) => f.endsWith(".css"))
								.sort()
								.map(
									(f) =>
										`${f}:${fs
											.readFileSync(path.join(stylesDir, f), "utf8")
											.trim()}`
								)
						),
					true
				)
			})
		],
		watchOptions: {
			additional: [path.join(srcPath, "styles", "*.css")]
		}
	};
};
