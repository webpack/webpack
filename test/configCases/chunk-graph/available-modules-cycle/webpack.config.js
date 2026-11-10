"use strict";

const { WebpackError } = require("../../../../");

/** @typedef {import("../../../../").Compilation} Compilation */

/**
 * @param {Compilation} compilation the compilation
 * @param {string} childName the named chunk group to look in
 * @param {string} parentName the parent it should have
 * @returns {boolean} whether the group has that parent
 */
const hasParent = (compilation, childName, parentName) => {
	const group = compilation.namedChunkGroups.get(childName);
	if (!group) throw new Error(`Chunk group "${childName}" was not created`);
	return group.getParents().some((parent) => parent.name === parentName);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	entry: "./index.js",
	output: {
		filename: "main.js",
		chunkFilename: "[name].js"
	},
	optimization: {
		splitChunks: false,
		minimize: false,
		concatenateModules: false,
		usedExports: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.compilation.tap("Test", (compilation) => {
					compilation.hooks.afterChunks.tap("Test", () => {
						// "g2" and "g3" import each other, so growth runs around a cycle.
						for (const [child, parent] of [
							["g2", "g3"],
							["g3", "g2"]
						]) {
							if (!hasParent(compilation, child, parent)) {
								compilation.errors.push(
									new WebpackError(`"${child}" should have parent "${parent}"`)
								);
							}
						}
					});
				});
			}
		}
	]
};
