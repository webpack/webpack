/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

const { CachedSource, ReplaceSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const RuntimeTemplate = require("../RuntimeTemplate");
const { getUndoPath } = require("../util/identifier");
const memoize = require("../util/memoize");

/** @import Chunk, { ChunkFilenameTemplate } from "../Chunk" */
/** @import Compiler from "../Compiler" */
/**
 * @import {
 * 	OutputNormalizedWithDefaults as OutputOptions
 * } from "../config/defaults"
 */
/** @import { Source } from "webpack-sources" */
/** @import { SpecifierPart } from "../RuntimeTemplate" */

const getJavascriptModulesPlugin = memoize(() =>
	require("../javascript/JavascriptModulesPlugin")
);
const getCssModulesPlugin = memoize(() => require("../css/CssModulesPlugin"));

/**
 * @typedef {object} ChunkAssetNaming
 * @property {(chunk: Chunk, outputOptions: OutputOptions) => ChunkFilenameTemplate} template what names the asset
 * @property {string} contentHashType which of the chunk's hashes the name reads
 */

/**
 * How each chunk-naming stand-in is spelled once the hashes exist, keyed rather than
 * branched on so a kind this pass does not answer for resolves to nothing instead of
 * silently taking another's name. `RuntimeTemplate` reserves only what is keyed here.
 * @type {Map<string, ChunkAssetNaming>}
 */
const CHUNK_ASSET_NAMING = new Map([
	[
		"chunk",
		{
			template: (chunk, outputOptions) =>
				getJavascriptModulesPlugin().getChunkFilenameTemplate(
					chunk,
					outputOptions
				),
			contentHashType: "javascript"
		}
	],
	[
		"cssChunk",
		{
			template: (chunk, outputOptions) =>
				getCssModulesPlugin().getChunkFilenameTemplate(chunk, outputOptions),
			contentHashType: "css"
		}
	]
]);

/**
 * first character, last character, replacement.
 * @typedef {[number, number, string]} Replacement
 */

const PASS_NAME = "analyzableChunkNaming";

/**
 * Fills in the names reserved during code generation, once the hashes they are built
 * from exist: a chunk's own filename, and the compilation hash inside any other
 * emitted asset's. Replaces in place so the asset keeps its mappings, and runs before
 * anything reads it — `RealContentHashPlugin` still repairs each rewritten chunk's own
 * name later. Registered wherever `output.module` is read, since nothing reserves a
 * stand-in without it — a reservation cannot arrange this itself, as a module restored
 * from the cache carries one without being generated again.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const fillReservedNames = (compiler) => {
	compiler.hooks.compilation.tap(PASS_NAME, (compilation) => {
		const cache = compilation.getCache(PASS_NAME);
		compilation.hooks.processAssets.tapPromise(
			{
				name: PASS_NAME,
				// Before source maps are written and before a minifier runs: both read
				// the asset, and a stand-in is a different length than what replaces it.
				// Every hash it reads is already settled — `createHash` runs ahead of
				// every `processAssets` stage — and `RealContentHashPlugin` still repairs
				// the names afterwards.
				stage: Compilation.PROCESS_ASSETS_STAGE_DERIVED
			},
			async () => {
				const { outputOptions } = compilation;
				const fullHash = compilation.hash;
				/** @type {Map<string, Chunk> | undefined} */
				let chunksById;
				/**
				 * @param {string} value text that may carry compilation-hash stand-ins
				 * @returns {string} the text with each of them filled in
				 */
				const fillFullHash = (value) => {
					if (fullHash === undefined) return value;
					RuntimeTemplate.FULL_HASH_TOKEN_REGEXP.lastIndex = 0;
					return value.replace(
						RuntimeTemplate.FULL_HASH_TOKEN_REGEXP,
						(_match, length) =>
							length === undefined
								? fullHash
								: fullHash.slice(0, Number(length))
					);
				};
				/**
				 * @param {string} payload the encoded half of a stand-in
				 * @param {string} assetName name of the asset the stand-in sits in
				 * @returns {string | null} the specifier, or `null` if unresolvable
				 */
				const resolve = (payload, assetName) => {
					const parts = RuntimeTemplate._readAnalyzableSpecifier(payload);
					if (parts === null) return null;
					/** @type {string | undefined} */
					let base;
					let specifier = "";
					for (const [kind, value] of parts) {
						if (kind === "base") {
							base = /** @type {string} */ (value);
						} else if (kind === "literal") {
							specifier += value;
						} else if (kind === "undo") {
							specifier += getUndoPath(
								assetName,
								/** @type {string} */ (outputOptions.path),
								true
							);
						} else if (kind === "template") {
							specifier += compilation.getPath(
								/** @type {string} */ (value),
								{}
							);
						} else if (kind === "publicPath") {
							specifier += compilation.getPath(
								outputOptions.publicPath || "",
								{}
							);
						} else {
							const naming = CHUNK_ASSET_NAMING.get(kind);
							// Nothing reserves a kind this pass cannot spell, so one arriving
							// here was written by something else and names no asset of ours.
							if (naming === undefined) return null;
							if (chunksById === undefined) {
								chunksById = new Map();
								for (const chunk of compilation.chunks) {
									if (chunk.id !== null) {
										chunksById.set(String(chunk.id), chunk);
									}
								}
							}
							const chunk = chunksById.get(String(value));
							if (chunk === undefined) return null;
							specifier += compilation.getPath(
								naming.template(chunk, outputOptions),
								// Matches what names the asset, or a placeholder resolved here would
								// not be the one on disk.
								{
									chunk,
									runtime: chunk.runtime,
									contentHashType: naming.contentHashType
								}
							);
						}
					}
					if (base !== undefined) {
						// An entry base replaces the output root, so the rest is read against it
						// here exactly as the runtime would have read it against `.b`.
						try {
							return new URL(fillFullHash(specifier), base).href;
						} catch (_error) {
							return null;
						}
					}
					// A bare specifier is a package name, so make it explicitly relative the way
					// the chunk loader does. A literal part may still carry a stand-in of its own,
					// so finish those here rather than scanning again.
					return fillFullHash(
						/^(?:\.{0,2}\/|[a-zA-Z][\w+.-]*:)/.test(specifier)
							? specifier
							: `./${specifier}`
					);
				};
				/** @type {{ name: string, source: Source, replacements: Replacement[] }[]} */
				const tasks = [];

				for (const name of Object.keys(compilation.assets)) {
					const source = compilation.assets[name];
					const content = source.source();
					if (typeof content !== "string") continue;
					RuntimeTemplate.ANALYZABLE_TOKEN_REGEXP.lastIndex = 0;
					RuntimeTemplate.FULL_HASH_TOKEN_REGEXP.lastIndex = 0;
					const hasChunkToken =
						RuntimeTemplate.ANALYZABLE_TOKEN_REGEXP.test(content);
					const hasFullHashToken =
						fullHash !== undefined &&
						RuntimeTemplate.FULL_HASH_TOKEN_REGEXP.test(content);
					if (!hasChunkToken && !hasFullHashToken) continue;
					/** @type {Replacement[]} */
					const replacements = [];
					/**
					 * @param {RegExp} pattern what to look for
					 * @param {(match: string, group: string) => string | null} fill what to put there
					 * @returns {void}
					 */
					const collect = (pattern, fill) => {
						// Its own instance: `fill` may run the shared one over what it
						// returns, and a `replace` there would rewind this scan.
						const regexp = new RegExp(pattern.source, pattern.flags);
						/** @type {RegExpExecArray | null} */
						let match;
						while ((match = regexp.exec(content)) !== null) {
							const value = fill(match[0], match[1]);
							if (value === null) continue;
							replacements.push([
								match.index,
								match.index + match[0].length - 1,
								value
							]);
						}
					};
					if (hasChunkToken) {
						collect(
							RuntimeTemplate.ANALYZABLE_TOKEN_REGEXP,
							(_match, payload) => resolve(payload, name)
						);
					}
					if (hasFullHashToken) {
						collect(RuntimeTemplate.FULL_HASH_TOKEN_REGEXP, (match) =>
							fillFullHash(match)
						);
					}
					if (replacements.length === 0) continue;

					tasks.push({ name, source, replacements });
				}
				if (tasks.length === 0) return;

				await Promise.all(
					tasks.map(async ({ name, source, replacements }) => {
						const replaced = await cache.providePromise(
							name,
							cache.mergeEtags(
								cache.getLazyHashedEtag(source),
								JSON.stringify(replacements)
							),
							() => {
								const replacedSource = new ReplaceSource(source);
								for (const [start, end, value] of replacements) {
									replacedSource.replace(start, end, value);
								}
								return new CachedSource(replacedSource);
							}
						);
						compilation.updateAsset(name, replaced);
					})
				);
			}
		);
	});
};

module.exports.fillReservedNames = fillReservedNames;
