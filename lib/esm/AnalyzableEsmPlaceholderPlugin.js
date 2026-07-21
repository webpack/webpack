/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q
*/

"use strict";

const { CachedSource, ReplaceSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const { toJsStringLiteral } = require("../util/identifier");
const {
	HASH_IN_FILENAME,
	PLACEHOLDER_PREFIX,
	PLACEHOLDER_REGEXP,
	PUBLIC_PATH_PLACEHOLDER,
	chunkFilenamePlaceholder
} = require("./analyzableEsmPlaceholders");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../Compiler")} Compiler */

const getJavascriptModulesPlugin = () =>
	require("../javascript/JavascriptModulesPlugin");

const PLUGIN_NAME = "AnalyzableEsmPlaceholderPlugin";

/**
 * Rewrites the post-hash placeholders baked into analyzable ESM literals (see
 * `lib/esm/analyzableEsmPlaceholders.js`) to the real chunk filenames / publicPath
 * once hashed assets exist. Runs before minification, devtool and realContentHash,
 * so the substituted literal takes part in all downstream processing.
 */
class AnalyzableEsmPlaceholderPlugin {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
				},
				() => {
					const { outputOptions } = compilation;
					const { publicPath } = outputOptions;
					const templatedPublicPath =
						typeof publicPath === "string" && publicPath.includes("[");
					// Placeholders exist only when some chunk filename hashes or the
					// publicPath is templated — skip the asset scan otherwise.
					let mayHavePlaceholders = templatedPublicPath;
					if (!mayHavePlaceholders) {
						for (const chunk of compilation.chunks) {
							const template =
								getJavascriptModulesPlugin().getChunkFilenameTemplate(
									chunk,
									outputOptions
								);
							if (
								typeof template === "string" &&
								HASH_IN_FILENAME.test(template)
							) {
								mayHavePlaceholders = true;
								break;
							}
						}
					}
					if (!mayHavePlaceholders) return;

					/** @type {Map<string, Chunk> | undefined} */
					let chunkByToken;
					/** @type {Map<string, string | null>} */
					const resolved = new Map();
					/**
					 * Resolves a placeholder token to its final path fragment.
					 * @param {string} token the matched placeholder
					 * @returns {string | null} resolved path, or `null` for an unknown token
					 */
					const resolveToken = (token) => {
						let result = resolved.get(token);
						if (result !== undefined) return result;
						if (token === PUBLIC_PATH_PLACEHOLDER) {
							// webpack emits this token only for a templated string publicPath.
							result = templatedPublicPath
								? compilation.getPath(/** @type {string} */ (publicPath), {
										hash: compilation.hash
									})
								: null;
						} else {
							if (chunkByToken === undefined) {
								chunkByToken = new Map();
								for (const chunk of compilation.chunks) {
									if (chunk.id !== null) {
										chunkByToken.set(chunkFilenamePlaceholder(chunk.id), chunk);
									}
								}
							}
							const chunk = chunkByToken.get(token);
							result =
								chunk === undefined
									? null
									: compilation.getPath(
											/** @type {string} */ (
												getJavascriptModulesPlugin().getChunkFilenameTemplate(
													chunk,
													outputOptions
												)
											),
											{
												chunk,
												contentHashType: JAVASCRIPT_TYPE,
												hash: compilation.hash,
												runtime: chunk.runtime
											}
										);
						}
						resolved.set(token, result);
						return result;
					};

					for (const asset of compilation.getAssets()) {
						const content = asset.source.source();
						if (
							typeof content !== "string" ||
							!content.includes(PLACEHOLDER_PREFIX)
						) {
							continue;
						}
						const newSource = new ReplaceSource(asset.source);
						PLACEHOLDER_REGEXP.lastIndex = 0;
						let match;
						let replaced = false;
						while ((match = PLACEHOLDER_REGEXP.exec(content)) !== null) {
							const path = resolveToken(match[0]);
							// An unknown token was not emitted by webpack — leave it untouched.
							if (path === null) continue;
							// The token sits inside a double-quoted literal, so escape the
							// substituted fragment for that context.
							newSource.replace(
								match.index,
								match.index + match[0].length - 1,
								toJsStringLiteral(path).slice(1, -1)
							);
							replaced = true;
						}
						if (replaced) {
							compilation.updateAsset(asset.name, new CachedSource(newSource));
						}
					}
				}
			);
		});
	}
}

module.exports = AnalyzableEsmPlaceholderPlugin;
