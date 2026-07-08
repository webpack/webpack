/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { RawSource, ReplaceSource } = require("webpack-sources");
const { ASSET_URL_TYPE } = require("../ModuleSourceTypeConstants");
const createHash = require("../util/createHash");
const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");
const { PUBLIC_PATH_AUTO } = require("../util/publicPathPlaceholder");
const AssetGenerator = require("./AssetGenerator");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Compilation").DependencyConstructor} DependencyConstructor */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../NormalModule")} NormalModule */

const WEBMANIFEST_TYPE = "webmanifest";
const WEBMANIFEST_TYPES = new Set([WEBMANIFEST_TYPE]);
const WEBMANIFEST_AND_ASSET_URL_TYPES = new Set([
	WEBMANIFEST_TYPE,
	ASSET_URL_TYPE
]);

/**
 * A Web App Manifest is a "typed asset": a variant of `AssetGenerator` (reusing
 * its filename/hash and `ASSET_URL_TYPE` machinery) whose emitted content is the
 * raw JSON with each icon `src` rewritten to its bundled asset URL. The manifest
 * itself is emitted — with its own URL exposed to the referencing
 * `<link rel="manifest">` — by `AssetModulesPlugin`'s `renderManifest`, which
 * resolves the per-file public path (like the CSS/HTML plugins).
 */
class WebManifestGenerator extends AssetGenerator {
	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 */
	constructor(moduleGraph) {
		super(moduleGraph, undefined, undefined, undefined, undefined, true);
	}

	/**
	 * Returns the source types available for this module.
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		// Expose the manifest's own URL only when it is referenced (from HTML).
		const connections = this._moduleGraph.getIncomingConnections(module);
		const referenced = !connections[Symbol.iterator]().next().done;
		return referenced ? WEBMANIFEST_AND_ASSET_URL_TYPES : WEBMANIFEST_TYPES;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();
		return originalSource ? originalSource.size() : 0;
	}

	/**
	 * Rewrites each icon `src` in the raw manifest to its emitted asset URL.
	 * @param {NormalModule} module the manifest module
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {string} the rewritten manifest content
	 */
	_rewrite(module, generateContext) {
		const originalSource = /** @type {Source} */ (module.originalSource());
		const source = new ReplaceSource(originalSource);
		// `HtmlSourceDependency.Template` only reads `moduleGraph`/`runtimeTemplate`/
		// `codeGenerationResults`; the rest is filled to satisfy the context shape.
		/** @type {DependencyTemplateContext} */
		const templateContext = {
			runtimeTemplate: generateContext.runtimeTemplate,
			dependencyTemplates: generateContext.dependencyTemplates,
			moduleGraph: generateContext.moduleGraph,
			chunkGraph: generateContext.chunkGraph,
			module,
			runtime: generateContext.runtime,
			runtimeRequirements: generateContext.runtimeRequirements,
			concatenationScope: generateContext.concatenationScope,
			codeGenerationResults:
				/** @type {CodeGenerationResults} */
				(generateContext.codeGenerationResults),
			initFragments: [],
			chunkInitFragments: []
		};
		for (const dependency of module.dependencies) {
			const constructor = /** @type {DependencyConstructor} */ (
				dependency.constructor
			);
			const template = templateContext.dependencyTemplates.get(constructor);
			if (!template) {
				throw new Error(
					`No template for dependency: ${dependency.constructor.name}`
				);
			}
			template.apply(dependency, source, templateContext);
		}
		return /** @type {string} */ (source.source());
	}

	/**
	 * Generates generated code for this runtime module.
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		if (!module.originalSource()) return new RawSource("");

		const { type, getData } = generateContext;
		const content = this._rewrite(module, generateContext);

		// Hash the *rewritten* content (so the filename tracks the icons) and reuse
		// the asset filename machinery, so a plain (icon-less) manifest emits like a
		// plain asset (`output.assetModuleFilename`, `[name]`, `[ext]`).
		const outputOptions = generateContext.runtimeTemplate.outputOptions;
		const hash = createHash(outputOptions.hashFunction);
		if (outputOptions.hashSalt) hash.update(outputOptions.hashSalt);
		hash.update(content);
		const fullContentHash = /** @type {string} */ (
			hash.digest(outputOptions.hashDigest)
		);
		const contentHash = nonNumericOnlyHash(
			fullContentHash,
			/** @type {number} */ (outputOptions.hashDigestLength)
		);
		const { filename, assetInfo } = AssetGenerator.getFilenameWithInfo(
			module,
			{ filename: undefined, outputPath: undefined },
			generateContext,
			contentHash,
			fullContentHash
		);

		const data = getData ? getData() : undefined;
		if (data) {
			data.set("filename", filename);
			data.set("assetInfo", assetInfo);
			if (type === ASSET_URL_TYPE) {
				data.set("url", {
					...data.get("url"),
					[ASSET_URL_TYPE]: PUBLIC_PATH_AUTO + filename
				});
			}
		}

		return type === ASSET_URL_TYPE ? null : new RawSource(content);
	}
}

module.exports = WebManifestGenerator;
