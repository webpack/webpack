"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {{ modified?: string[], removed?: string[] }} */
let changes = {};

/**
 * @param {ReadonlySet<string> | undefined} files absolute paths
 * @param {string} context the compiler context
 * @returns {string[] | undefined} the paths relative to it, sorted
 */
const relative = (files, context) =>
	files && [...files].map((file) => path.relative(context, file)).sort();

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		(compiler) => {
			compiler.hooks.watchRun.tap("ModifiedRemovedFiles", () => {
				changes = {
					modified: relative(compiler.modifiedFiles, compiler.context),
					removed: relative(compiler.removedFiles, compiler.context)
				};
			});
		},
		new webpack.DefinePlugin({
			// Bun's fs.watch reports an unlink inconsistently across runs.
			IS_BUN: JSON.stringify(Boolean(process.versions.bun)),
			CHANGES: webpack.DefinePlugin.runtimeValue(
				() => JSON.stringify(changes),
				true
			)
		}),
		(compiler) => {
			// Watched but imported by nothing, so removing it breaks no module.
			const extra = path.resolve(compiler.context, "extra.txt");
			new webpack.DefinePlugin({
				HAS_EXTRA: webpack.DefinePlugin.runtimeValue(
					() => JSON.stringify(fs.existsSync(extra)),
					{ fileDependencies: [extra] }
				)
			}).apply(compiler);
		}
	]
};
