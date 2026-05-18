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
/** @typedef {import("../NormalModule")} NormalModuleType */
/** @typedef {import("../NormalModule").Result} Result */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

const getSourceMapSource = memoize(
	() => require("webpack-sources").SourceMapSource
);

const PLUGIN_NAME = "TypeScriptPlugin";

/** @type {Set<string>} */
const JS_MODULE_TYPES = new Set([
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
]);

const TS_RESOURCE_RE = /\.(?:[mc]?tsx?)$/i;
const TSX_RESOURCE_RE = /\.[mc]?tsx$/i;
const TS_DATA_URI_RE = /^data:(?:text|application)\/typescript/i;

const TSX_NOT_SUPPORTED =
	"experiments.typescript does not support .tsx/JSX. " +
	"Use a TSX-capable loader (e.g. swc-loader, esbuild-loader, ts-loader) for .tsx files.";

const NODE_API_MISSING =
	"experiments.typescript requires Node.js >= 22.6. " +
	"`module.stripTypeScriptTypes` is not available on this Node.js version.";

/**
 * Whether the resource (path or `data:` URI) should go through the TypeScript
 * transform. Returns true for `.ts`, `.cts`, `.mts`, and the JSX-flavoured
 * variants (so the `.tsx` branch can throw a friendly error), as well as the
 * `text/typescript` / `application/typescript` data URIs.
 * @param {string} resource module resource (without query string)
 * @returns {boolean} true if the resource should be transformed
 */
const isTypeScriptResource = (resource) =>
	TS_RESOURCE_RE.test(resource) || TS_DATA_URI_RE.test(resource);

/**
 * Build a line-granularity identity source map for a strip-types output.
 * `mode: "strip"` replaces type annotations with whitespace, so the stripped
 * output preserves the original line layout — an identity mapping is correct.
 * Node's API does not emit a source map in strip mode (`sourceMap: true` is
 * rejected on Node 22+ and Node 26+), so we construct one by hand.
 * @param {string} resource module resource path
 * @param {string} originalSource pre-strip source content
 * @returns {RawSourceMap} identity source map
 */
const createIdentitySourceMap = (resource, originalSource) => {
	const lineCount = (originalSource.match(/\n/g) || []).length + 1;
	// Mappings: each line emits a single segment at column 0 mapping to
	// column 0 of the same line in the source. `AAAA` for line 1, `;AACA`
	// for each subsequent line (cumulative source-line delta of +1 per line).
	const mappings = `AAAA${";AACA".repeat(lineCount - 1)}`;

	return {
		version: 3,
		file: resource,
		sources: [resource],
		sourcesContent: [originalSource],
		names: [],
		mappings
	};
};

/**
 * Compose the strip-types source map with an upstream loader source map so the
 * final map points back to the loader's original input (e.g. a `.vue` /
 * `.svelte` / custom loader that emits TS code).
 * @param {string} resource module resource
 * @param {string} strippedSource post-strip JS
 * @param {RawSourceMap} stripMap identity map for the strip step
 * @param {string} preStripSource pre-strip TS (loader output)
 * @param {string | RawSourceMap} loaderSourceMap upstream loader source map
 * @returns {RawSourceMap} composed map
 */
const composeWithLoaderSourceMap = (
	resource,
	strippedSource,
	stripMap,
	preStripSource,
	loaderSourceMap
) => {
	const SourceMapSource = getSourceMapSource();
	const composed = new SourceMapSource(
		strippedSource,
		resource,
		stripMap,
		preStripSource,
		loaderSourceMap,
		true
	);
	return /** @type {RawSourceMap} */ (composed.sourceAndMap().map) || stripMap;
};

/**
 * Run `module.stripTypeScriptTypes` on the input, wrapping any thrown
 * `TypeScript ...` errors as `ModuleBuildError` so they surface as
 * per-module build errors instead of uncaught exceptions.
 * @param {string} input pre-strip TS source (BOM-free string)
 * @returns {string} stripped JS
 */
const stripTypes = (input) => {
	try {
		// Pass only `mode`. `sourceUrl` would emit a `//# sourceURL=…` pragma
		// into the output (V8 debugger hint), and `sourceMap: true` is
		// rejected in strip mode — we build the source map by hand instead.
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		return mod.stripTypeScriptTypes(input, { mode: "strip" });
	} catch (err) {
		throw new ModuleBuildError(/** @type {Error} */ (err));
	}
};

/**
 * Coerce a Buffer-or-string source to a UTF-8 string, dropping any BOM.
 * @param {string | Buffer} source raw source from the loader pipeline
 * @returns {string} UTF-8 string without BOM
 */
const toBomFreeString = (source) => {
	const text = Buffer.isBuffer(source) ? source.toString("utf8") : source;
	const stripped = removeBOM(text);
	return typeof stripped === "string" ? stripped : stripped.toString("utf8");
};

class TypeScriptPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			NormalModule.getCompilationHooks(compilation).processResult.tap(
				PLUGIN_NAME,
				(result, module) => this._processResult(result, module)
			);
		});
	}

	/**
	 * processResult tap body. Returns the input untouched unless this is a
	 * TypeScript module that needs to be transformed.
	 * @param {Result} result loader result tuple
	 * @param {NormalModuleType} module the normal module
	 * @returns {Result} possibly transformed result
	 */
	_processResult(result, module) {
		if (!JS_MODULE_TYPES.has(module.type)) return result;

		const parser = /** @type {JavascriptParser} */ (module.parser);
		if (!parser.options.typescript) return result;

		const resource = module.nameForCondition();
		if (!resource || !isTypeScriptResource(resource)) return result;

		if (TSX_RESOURCE_RE.test(resource)) {
			throw new ModuleBuildError(new Error(TSX_NOT_SUPPORTED));
		}

		if (!("stripTypeScriptTypes" in mod)) {
			throw new ModuleBuildError(new Error(NODE_API_MISSING));
		}

		const [rawSource, loaderSourceMap, ...rest] = result;
		const preStripSource = toBomFreeString(rawSource);
		const strippedSource = stripTypes(preStripSource);

		const needSourceMap = module.useSourceMap || module.useSimpleSourceMap;
		const stripMap = needSourceMap
			? createIdentitySourceMap(module.resource, preStripSource)
			: undefined;

		const outputSourceMap =
			stripMap && loaderSourceMap
				? composeWithLoaderSourceMap(
						module.resource,
						strippedSource,
						stripMap,
						preStripSource,
						loaderSourceMap
					)
				: stripMap || loaderSourceMap;

		return [strippedSource, outputSourceMap, ...rest];
	}
}

module.exports = TypeScriptPlugin;
