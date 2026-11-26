"use strict";

const { Volume, createFsFromVolume } = require("memfs");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: {
		main: "./index.js",
		"entry\u001B[2mDIM": "./c.js"
	},
	plugins: [
		{
			apply(compiler) {
				// Windows can't create a file whose name holds a control character
				compiler.outputFileSystem = /** @type {EXPECTED_ANY} */ (
					createFsFromVolume(new Volume())
				);
			}
		}
	],
	stats: {
		assets: true,
		chunks: true,
		chunkOrigins: true,
		chunkRelations: true,
		ids: true,
		modules: true,
		reasons: true,
		colors: true
	}
};
