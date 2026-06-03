/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { ASSET_URL_TYPE } = require("../ModuleSourceTypeConstants");
const RawDataUrlModule = require("../asset/RawDataUrlModule");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("../Module").CodeGenerationResultData} CodeGenerationResultData */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../Template").RuntimeTemplate} RuntimeTemplate */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

class CssUrlDependency extends ModuleDependency {
	/**
	 * Creates an instance of CssUrlDependency.
	 * @param {string} request request
	 * @param {Range} range range of the argument
	 * @param {"string" | "url" | "src"} urlType dependency type e.g. url() or string
	 */
	constructor(request, range, urlType) {
		super(request);
		this.range = range;
		this.urlType = urlType;
	}

	get type() {
		return "css url()";
	}

	get category() {
		return "url";
	}

	/**
	 * Creates an ignored module.
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		return getIgnoredRawDataUrlModule();
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// The dependency template substitutes the referenced asset's hashed
		// filename into the rendered CSS at code-generation time. Folding the
		// asset module's content hash into the dependency hash ensures the
		// CSS module's hash invalidates — and the CSS chunk's contenthash
		// updates — whenever the referenced asset's content changes.
		const { chunkGraph } = context;
		const { moduleGraph } = chunkGraph;
		const module = moduleGraph.getModule(this);
		if (!module) return;
		// `exportType: "url"` target: the rendered filename is the bundled CSS
		// chunk's, so track the bundled module's hash instead of this JS-only
		// module's.
		if (
			/** @type {{ exportType?: string }} */ (module).exportType === "url" &&
			module.blocks.length > 0
		) {
			const entryDep = module.blocks[0].dependencies[0];
			const linkModule = entryDep && moduleGraph.getModule(entryDep);
			const linkBuildInfo =
				linkModule &&
				/** @type {BuildInfo | undefined} */ (linkModule.buildInfo);
			if (linkBuildInfo && linkBuildInfo.hash) {
				hash.update(/** @type {string} */ (linkBuildInfo.hash));
			}
			return;
		}
		const buildInfo = /** @type {BuildInfo | undefined} */ (module.buildInfo);
		if (buildInfo && buildInfo.hash) {
			hash.update(/** @type {string} */ (buildInfo.hash));
		}
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.urlType);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.urlType = read();
		super.deserialize(context);
	}
}

/**
 * Returns string in quotes if needed.
 * @param {string} str string
 * @returns {string} string in quotes if needed
 */
const cssEscapeString = (str) => {
	let countWhiteOrBracket = 0;
	let countQuotation = 0;
	let countApostrophe = 0;
	for (let i = 0; i < str.length; i++) {
		const cc = str.charCodeAt(i);
		switch (cc) {
			case 9: // tab
			case 10: // nl
			case 32: // space
			case 40: // (
			case 41: // )
				countWhiteOrBracket++;
				break;
			case 34:
				countQuotation++;
				break;
			case 39:
				countApostrophe++;
				break;
		}
	}
	if (countWhiteOrBracket < 2) {
		return str.replace(/[\n\t ()'"\\]/g, (m) => `\\${m}`);
	} else if (countQuotation <= countApostrophe) {
		return `"${str.replace(/[\n"\\]/g, (m) => `\\${m}`)}"`;
	}
	return `'${str.replace(/[\n'\\]/g, (m) => `\\${m}`)}'`;
};

CssUrlDependency.Template = class CssUrlDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ type, moduleGraph, runtimeTemplate, codeGenerationResults }
	) {
		if (type === "javascript") return;
		const dep = /** @type {CssUrlDependency} */ (dependency);
		const module = /** @type {Module} */ (moduleGraph.getModule(dep));

		const rawUrl = this.assetUrl({
			module,
			codeGenerationResults,
			runtimeTemplate
		});

		/** @type {string | undefined} */
		let newValue;

		switch (dep.urlType) {
			case "string":
				newValue = cssEscapeString(rawUrl);
				break;
			case "url":
				newValue = `url(${cssEscapeString(rawUrl)})`;
				break;
			case "src":
				newValue = `src(${cssEscapeString(rawUrl)})`;
				break;
		}

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			/** @type {string} */ (newValue)
		);
	}

	/**
	 * Returns the url of the asset.
	 * @param {object} options options object
	 * @param {Module} options.module the module
	 * @param {RuntimeSpec=} options.runtime runtime
	 * @param {CodeGenerationResults} options.codeGenerationResults the code generation results
	 * @param {RuntimeTemplate=} options.runtimeTemplate the runtime template
	 * @returns {string} the url of the asset
	 */
	assetUrl({ runtime, module, codeGenerationResults, runtimeTemplate }) {
		if (!module) {
			return "data:,";
		}
		// `exportType: "url"` CSS module (a `.css` referenced via `url()`): the
		// CSS is bundled into its own chunk — point the `url()` at that file.
		if (
			runtimeTemplate &&
			/** @type {{ exportType?: string }} */ (module).exportType === "url"
		) {
			return this.cssChunkUrl(module, runtimeTemplate);
		}
		const codeGen = codeGenerationResults.get(module, runtime);
		const data = codeGen.data;
		if (!data) return "data:,";
		const url = data.get("url");
		if (!url || !url[ASSET_URL_TYPE]) return "data:,";
		return url[ASSET_URL_TYPE];
	}

	/**
	 * Returns the static url of the CSS chunk emitted for an `exportType: "url"`
	 * module. The chunk's content hash is unknown at code-generation time, so a
	 * placeholder carrying the chunk id is emitted and resolved against the real
	 * filename in `CssModulesPlugin.renderModule` (and the public-path
	 * placeholder makes it relative to the referencing CSS file).
	 * @param {Module} module the `exportType: "url"` CSS module
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @returns {string} the chunk url
	 */
	cssChunkUrl(module, runtimeTemplate) {
		const { compilation } = runtimeTemplate;
		const { chunkGraph, outputOptions } = compilation;
		const block = module.blocks[0];
		if (!block) return "data:,";
		const chunkGroup = chunkGraph.getBlockChunkGroup(block);
		if (!chunkGroup) return "data:,";
		const chunk = chunkGroup.chunks[chunkGroup.chunks.length - 1];
		const { publicPath } = outputOptions;
		const base =
			publicPath === "auto" || typeof publicPath !== "string"
				? CssUrlDependency.PUBLIC_PATH_AUTO
				: publicPath;
		return `${base}${CssUrlDependency.CHUNK_FILENAME}${Buffer.from(
			String(chunk.id)
		).toString("hex")}__`;
	}
};

makeSerializable(CssUrlDependency, "webpack/lib/dependencies/CssUrlDependency");

CssUrlDependency.PUBLIC_PATH_AUTO = "__WEBPACK_CSS_PUBLIC_PATH_AUTO__";
CssUrlDependency.PUBLIC_PATH_FULL_HASH = "__WEBPACK_CSS_PUBLIC_PATH_FULL_HASH_";
// Placeholder for a bundled CSS chunk's filename (`url()` → `exportType: "url"`
// module); the hex-encoded chunk id follows and is closed by `__`.
CssUrlDependency.CHUNK_FILENAME = "__WEBPACK_CSS_CHUNK_FILENAME_";

module.exports = CssUrlDependency;
