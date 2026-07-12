"use strict";

const fs = require("node:fs");

/** @typedef {import("../../../../").Compiler} Compiler */

// Emit through a directory junction (mklink /J on Windows) / symlink to verify
// the build does not stall at the emit phase (#5915). `output.path` is a
// junction pointing at the real output directory the test runner reads from, so
// assets are written by traversing the junction.
/** @type {(env: unknown, argv: { testPath: string }) => import("../../../../").Configuration} */
module.exports = (env, { testPath }) => {
	const link = `${testPath}-via-junction`;
	return {
		output: {
			path: link
		},
		plugins: [
			/** @param {Compiler} compiler compiler */
			(compiler) => {
				compiler.hooks.environment.tap("EmitThroughJunction", () => {
					if (!fs.existsSync(link)) {
						// real NTFS junction on Windows, symlink on POSIX
						fs.symlinkSync(testPath, link, "junction");
					}
				});
			}
		]
	};
};
