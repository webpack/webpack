"use strict";

const { ConcatSource } = require("webpack-sources");
const { DefinePlugin, javascript } = require("../../../../");

/** @import { Compiler, Chunk, Configuration } from "../../../../" */

const PLUGIN_NAME = "NameOtherChunkPlugin";

// Writes the file name of `other` into `main`, and declares that dependency so
// `main` is hashed after `other` and changes with it. `main` sorts first by id.
class NameOtherChunkPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			/**
			 * @param {string} name chunk name
			 * @returns {Chunk} the chunk
			 */
			const byName = (name) =>
				/** @type {Chunk} */ (compilation.namedChunks.get(name));
			compilation.hooks.chunkHashDependencies.tap(
				PLUGIN_NAME,
				(chunk, dependencies) => {
					if (chunk.name === "main") dependencies.add(byName("other"));
				}
			);
			javascript.JavascriptModulesPlugin.getCompilationHooks(
				compilation
			).renderChunk.tap(PLUGIN_NAME, (source, { chunk }) => {
				if (chunk.name !== "main") return source;
				const other = byName("other");
				const file = compilation.getPath(
					/** @type {string} */ (compilation.outputOptions.filename),
					{ chunk: other, contentHashType: "javascript" }
				);
				return new ConcatSource(source, `\n// other: "./${file}"\n`);
			});
		});
	}
}

/** @type {Configuration[]} */
module.exports = [true, false].map((realContentHash, index) => ({
	name: `compiler-${index}`,
	mode: "production",
	target: "node",
	cache: { type: "filesystem" },
	entry: {
		bundle: { import: "./index.js", filename: `bundle${index}.js` },
		main: "./entry.js",
		other: "./other.js"
	},
	output: {
		filename: `[name]-${index}.[contenthash].js`,
		clean: false
	},
	plugins: [
		new NameOtherChunkPlugin(),
		new DefinePlugin({ NAME: JSON.stringify(`compiler-${index}`) })
	],
	optimization: {
		minimize: false,
		chunkIds: "named",
		realContentHash,
		runtimeChunk: "single"
	}
}));
