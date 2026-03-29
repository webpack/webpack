/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Soumyaraj Bag @soumyarajbag - Webpack HTML Entry Points
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Compilation = require("../Compilation");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const HtmlUrlDependency = require("../dependencies/HtmlUrlDependency");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../NormalModule")} NormalModule */

const PLUGIN_NAME = "HtmlModulesPlugin";

/**
 * Returns the public path from compilation output options.
 * When `publicPath: "auto"`, we emit relative paths (empty prefix) because
 * the HTML file itself is the document — relative paths work fine.
 *
 * @param {Compilation} compilation
 * @returns {string}
 */
const getPublicPath = (compilation) => {
	const { publicPath } = compilation.outputOptions;
	if (!publicPath || publicPath === "auto") return "";
	return /** @type {string} */ (publicPath);
};

/**
 * Given a module, tries to find its output URL after chunk assets have been
 * created (i.e., chunk.files is populated).
 *
 * Strategy:
 *  1. Asset modules (images, fonts …): read `module.buildInfo.filename`
 *  2. JS / CSS modules: find the chunk(s) they belong to and read chunk.files
 *
 * @param {NormalModule} module
 * @param {Compilation} compilation
 * @param {string} publicPath
 * @returns {string | undefined}
 */
const getModuleOutputUrl = (module, compilation, publicPath) => {
	const { chunkGraph } = compilation;

	// ── Asset modules (type starts with "asset") ────────────────────────────
	if (module.type.startsWith("asset")) {
		const filename = /** @type {BuildInfo} */ (module.buildInfo).filename;
		if (filename) return publicPath + filename;

		// Fallback: scan compilation assets for the module's resource
		const resource = module.resource;
		if (resource) {
			for (const assetName of Object.keys(compilation.assets)) {
				// Match by resource basename (heuristic, works for simple cases)
				if (assetName.includes(require("path").basename(resource, require("path").extname(resource)))) {
					return publicPath + assetName;
				}
			}
		}
		return undefined;
	}

	// ── JS / CSS modules: look for their chunk files ─────────────────────────
	const chunks = chunkGraph
		? [...chunkGraph.getModuleChunksIterable(module)]
		: [];

	for (const chunk of chunks) {
		for (const file of chunk.files) {
			// Return the first meaningful output file for this chunk.
			// Prefer .js for script deps, .css for link deps — the caller
			// already filtered by referenceType so we just take the first file.
			if (!file.endsWith(".map")) {
				return publicPath + file;
			}
		}
	}

	return undefined;
};

/**
 * Build the output HTML for a given HTML module.
 *
 * @param {NormalModule} module  the HTML entry module
 * @param {string} htmlSource    original HTML source
 * @param {Compilation} compilation
 * @returns {string}
 */
const renderHtml = (module, htmlSource, compilation) => {
	const { moduleGraph } = compilation;
	const publicPath = getPublicPath(compilation);

	/** @type {Array<{ dep: HtmlUrlDependency, url: string }>} */
	const replacements = [];

	for (const dep of module.dependencies) {
		if (!(dep instanceof HtmlUrlDependency)) continue;

		const resolvedModule = /** @type {NormalModule | null} */ (
			moduleGraph.getModule(dep)
		);
		if (!resolvedModule) continue;

		// For "link" (stylesheet) deps we want the CSS output file
		// For "script" deps we want the JS output file
		// For "url" deps (images etc.) we want the asset URL
		let url = getModuleOutputUrl(resolvedModule, compilation, publicPath);

		// For CSS modules in the same entry chunk, prefer .css files
		if (
			dep.referenceType === "link" &&
			url &&
			!url.endsWith(".css") &&
			!url.endsWith(".css?")
		) {
			// Try to find a .css file instead
			const chunks = compilation.chunkGraph
				? [...compilation.chunkGraph.getModuleChunksIterable(resolvedModule)]
				: [];
			for (const chunk of chunks) {
				for (const file of chunk.files) {
					if (file.endsWith(".css")) {
						url = publicPath + file;
						break;
					}
				}
			}
		}

		if (url) {
			replacements.push({ dep, url });
		}
	}

	if (replacements.length === 0) return htmlSource;

	// Apply replacements from back to front so earlier indices stay valid
	replacements.sort((a, b) => b.dep.range[0] - a.dep.range[0]);

	let output = htmlSource;
	for (const { dep, url } of replacements) {
		const [start, end] = dep.range;
		output = output.slice(0, start) + url + output.slice(end);
	}

	return output;
};

/**
 * Compute the output HTML filename for a given entry chunk.
 *
 * We derive it from the entry name:  "main" → "main.html", "index" → "index.html".
 * Users can override this with output.htmlFilename (not yet in schema, future work).
 *
 * @param {import("../Chunk")} chunk
 * @param {Compilation} compilation
 * @returns {string}
 */
const getHtmlOutputFilename = (chunk, compilation) => {
	const { htmlFilename } = /** @type {any} */ (compilation.outputOptions);
	if (htmlFilename) {
		return compilation.getPath(htmlFilename, { chunk });
	}
	// Default: use the entry name (chunk.name) + ".html"
	const name = chunk.name || "index";
	return `${name}.html`;
};

// ─────────────────────────────────────────────────────────────────────────────

class HtmlModulesPlugin {
	/**
	 * @param {Compiler} compiler
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// ── Register HtmlUrlDependency with the factory ──────────────────
				compilation.dependencyFactories.set(
					HtmlUrlDependency,
					normalModuleFactory
				);
				// HtmlUrlDependency needs no custom template — we handle URL
				// replacement manually in processAssets.
				compilation.dependencyTemplates.set(
					HtmlUrlDependency,
					new HtmlUrlDependency.Template()
				);

				// ── Register Parser for "html" module type ───────────────────────
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlParser());

				// ── Register Generator for "html" module type ────────────────────
				normalModuleFactory.hooks.createGenerator
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlGenerator());

				// ── Emit HTML files in processAssets ─────────────────────────────
				compilation.hooks.processAssets.tapAsync(
					{
						name: PLUGIN_NAME,
						stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
					},
					(assets, callback) => {
						const { chunkGraph } = compilation;

						for (const chunk of compilation.chunks) {
							// Only process entry chunks
							if (!chunk.canBeInitial()) continue;

							// Find the HTML module in this chunk (there should be at most one)
							/** @type {NormalModule | undefined} */
							let htmlModule;
							for (const mod of chunkGraph.getChunkModulesIterable(chunk)) {
								if (
									/** @type {NormalModule} */ (mod).type === HTML_MODULE_TYPE
								) {
									htmlModule = /** @type {NormalModule} */ (mod);
									break;
								}
							}
							if (!htmlModule) continue;

							// Get the original HTML source
							const originalSource = htmlModule.originalSource();
							if (!originalSource) continue;
							const htmlSource = /** @type {string} */ (
								originalSource.source()
							);

							// Render the HTML with resolved output URLs
							const outputHtml = renderHtml(htmlModule, htmlSource, compilation);

							// Compute output filename
							const filename = getHtmlOutputFilename(chunk, compilation);

							// Emit the HTML as a new asset (overwrite if already present)
							compilation.emitAsset(filename, new RawSource(outputHtml), {
								sourceFilename: htmlModule.resource
							});
						}

						callback();
					}
				);
			}
		);
	}
}

module.exports = HtmlModulesPlugin;
