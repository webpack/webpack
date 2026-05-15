/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const mod = require("module");
const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const ModuleBuildError = require("../errors/ModuleBuildError");
const memoize = require("../util/memoize");
const removeBOM = require("../util/removeBOM");

/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

const getSourceMapSource = memoize(
	() => require("webpack-sources").SourceMapSource
);

const PLUGIN_NAME = "TypeScriptPlugin";

const TS_RESOURCE_RE = /\.(?:[mc]?tsx?)$/i;
const TSX_RESOURCE_RE = /\.[mc]?tsx$/i;
const TS_DATA_URI_RE = /^data:(?:text|application)\/typescript/i;

/** @type {Set<string>} */
const JS_TYPES = new Set([
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
]);

class TypeScriptPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tap(
				PLUGIN_NAME,
				(result, module) => {
					if (!JS_TYPES.has(module.type)) {
						return result;
					}

					const parser =
						/** @type {JavascriptParser} */
						(module.parser);
					if (!parser.options.typescript) {
						return result;
					}

					const resource = module.nameForCondition();
					if (!resource) return result;

					const isTsFile = TS_RESOURCE_RE.test(resource);
					const isTsDataUri = TS_DATA_URI_RE.test(resource);
					if (!isTsFile && !isTsDataUri) return result;

					if (TSX_RESOURCE_RE.test(resource)) {
						throw new ModuleBuildError(
							new Error(
								"experiments.typescript does not support .tsx/JSX. " +
									"Use a TSX-capable loader (e.g. swc-loader, esbuild-loader, ts-loader) for .tsx files."
							)
						);
					}

					if (!("stripTypeScriptTypes" in mod)) {
						throw new ModuleBuildError(
							new Error(
								"experiments.typescript requires Node.js >= 22.7. " +
									"`module.stripTypeScriptTypes` is not available on this Node.js version."
							)
						);
					}

					const [rawSource, inputSourceMap, ...rest] = result;
					const needSourceMap =
						module.useSourceMap || module.useSimpleSourceMap;
					const inputSource = removeBOM(
						Buffer.isBuffer(rawSource) ? rawSource.toString("utf8") : rawSource
					);
					const inputSourceString =
						typeof inputSource === "string"
							? inputSource
							: inputSource.toString("utf8");

					let strippedSource;
					try {
						strippedSource =
							// eslint-disable-next-line n/no-unsupported-features/node-builtins
							mod.stripTypeScriptTypes(inputSourceString, {
								mode: "strip",
								sourceUrl: module.resource
							});
					} catch (err) {
						throw new ModuleBuildError(/** @type {Error} */ (err));
					}

					// `mode: "strip"` replaces type annotations with whitespace, so the
					// stripped output preserves the original line layout. Build a
					// line-granularity identity source map manually — Node's API does
					// not emit one in strip mode (`sourceMap: true` is rejected).
					/** @type {RawSourceMap | undefined} */
					let stripMap;
					if (needSourceMap) {
						const lineCount = (inputSourceString.match(/\n/g) || []).length + 1;
						stripMap = {
							version: 3,
							file: module.resource,
							sources: [module.resource],
							sourcesContent: [inputSourceString],
							names: [],
							mappings:
								lineCount > 0 ? `AAAA${";AACA".repeat(lineCount - 1)}` : ""
						};
					}

					/** @type {RawSourceMap | string | undefined} */
					let outputSourceMap = stripMap;

					// If an upstream loader produced a source map, compose its map
					// with the strip-types map so the final map points back to the
					// loader's original input (e.g. a .vue/.svelte/custom loader that
					// emits TS code).
					if (stripMap && inputSourceMap) {
						const SourceMapSource = getSourceMapSource();
						const composed = new SourceMapSource(
							strippedSource,
							module.resource,
							stripMap,
							inputSourceString,
							inputSourceMap,
							true
						);
						const { map } = composed.sourceAndMap();
						outputSourceMap = map || stripMap;
					} else if (!stripMap && inputSourceMap) {
						outputSourceMap = inputSourceMap;
					}

					return [strippedSource, outputSourceMap, ...rest];
				}
			);
		});
	}
}

module.exports = TypeScriptPlugin;
