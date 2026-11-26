"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {(env: unknown, options: { testPath: string, srcPath: string }) => Configuration[]} */
module.exports = (env, { testPath, srcPath }) => {
	const entries = path.join(srcPath, "entries.json");
	return [
		{
			name: "main",
			target: "node",
			entry: "./index.js",
			// `style` writes inside this output path while both compilers run
			output: { clean: { keep: /^style(?:[/\\]|$)/ } }
		},
		{
			name: "style",
			target: "web",
			mode: "development",
			devtool: false,
			experiments: { css: true },
			// read on each build, so step 1 leaves the compiler with no entry
			entry: () => JSON.parse(fs.readFileSync(entries, "utf8")),
			output: { path: path.join(testPath, "style") },
			optimization: { chunkIds: "named" },
			plugins: [
				new webpack.HotModuleReplacementPlugin(),
				{
					apply(compiler) {
						compiler.hooks.thisCompilation.tap(
							"WatchEntries",
							(compilation) => {
								compilation.fileDependencies.add(entries);
							}
						);
					}
				}
			]
		}
	];
};
