/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { RawSource } = require("webpack-sources");
const ConcatenationScope = require("../ConcatenationScope");
const Generator = require("../Generator");
const {
	CSS_TYPE,
	CSS_URL_TYPE,
	CSS_URL_TYPES,
	JAVASCRIPT_AND_CSS_URL_TYPES,
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES,
	NO_TYPES
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("../Module").SourceType} SourceType */
/** @typedef {import("../Module").SourceTypes} SourceTypes */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../NormalModule")} NormalModule */

class AssetSourceGenerator extends Generator {
	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 */
	constructor(moduleGraph) {
		super();

		this._moduleGraph = moduleGraph;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(
		module,
		{ type, concatenationScope, getData, runtimeTemplate, runtimeRequirements }
	) {
		const originalSource = module.originalSource();
		const data = getData ? getData() : undefined;

		switch (type) {
			case JAVASCRIPT_TYPE: {
				if (!originalSource) {
					return new RawSource("");
				}

				const content = originalSource.source();
				const encodedSource =
					typeof content === "string" ? content : content.toString("utf8");

				/** @type {string} */
				let sourceContent;
				const isNamespace =
					/** @type {import("../Module").BuildMeta} */ (module.buildMeta)
						.exportsType === "namespace";
				// Per CreateDefaultExportSyntheticModule spec, namespace only has "default".
				// Skip __webpack_require__.r() for asset/source namespace modules to avoid
				// injecting __esModule. Similar to JSON modules using namedExports: false
				// when imported via `with { type: "json" }` (spec import).
				// https://tc39.es/proposal-json-modules/#sec-create-default-export-synthetic-module
				if (concatenationScope) {
					if (isNamespace) {
						concatenationScope.registerExport(
							"default",
							ConcatenationScope.DEFAULT_EXPORT
						);
					} else {
						concatenationScope.registerNamespaceExport(
							ConcatenationScope.NAMESPACE_OBJECT_EXPORT
						);
					}
					const exportSymbol = isNamespace
						? ConcatenationScope.DEFAULT_EXPORT
						: ConcatenationScope.NAMESPACE_OBJECT_EXPORT;
					sourceContent = `${runtimeTemplate.renderConst()} ${exportSymbol} = ${JSON.stringify(encodedSource)};`;
				} else if (isNamespace) {
					runtimeRequirements.add(RuntimeGlobals.definePropertyGetters);
					runtimeRequirements.add(RuntimeGlobals.exports);
					sourceContent =
						`${RuntimeGlobals.definePropertyGetters}(${module.exportsArgument}, ` +
						`{ "default": ${runtimeTemplate.returningFunction(
							JSON.stringify(encodedSource)
						)} });`;
				} else {
					runtimeRequirements.add(RuntimeGlobals.module);
					sourceContent = `${module.moduleArgument}.exports = ${JSON.stringify(
						encodedSource
					)};`;
				}
				return new RawSource(sourceContent);
			}
			case CSS_URL_TYPE: {
				if (!originalSource) {
					return null;
				}

				const content = originalSource.source();
				const encodedSource =
					typeof content === "string" ? content : content.toString("utf8");

				if (data) {
					data.set("url", { [type]: encodedSource });
				}
				return null;
			}
			default:
				return null;
		}
	}

	/**
	 * @param {Error} error the error
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generateError(error, module, generateContext) {
		switch (generateContext.type) {
			case JAVASCRIPT_TYPE: {
				return new RawSource(
					`throw new Error(${JSON.stringify(error.message)});`
				);
			}
			default:
				return null;
		}
	}

	/**
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		return undefined;
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		/** @type {Set<string>} */
		const sourceTypes = new Set();
		const connections = this._moduleGraph.getIncomingConnections(module);

		for (const connection of connections) {
			if (!connection.originModule) {
				continue;
			}

			sourceTypes.add(connection.originModule.type.split("/")[0]);
		}

		if (sourceTypes.size > 0) {
			if (sourceTypes.has(JAVASCRIPT_TYPE) && sourceTypes.has(CSS_TYPE)) {
				return JAVASCRIPT_AND_CSS_URL_TYPES;
			} else if (sourceTypes.has(CSS_TYPE)) {
				return CSS_URL_TYPES;
			}
			return JAVASCRIPT_TYPES;
		}

		return NO_TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();

		if (!originalSource) {
			return 0;
		}

		// Example: m.exports="abcd"
		return originalSource.size() + 12;
	}
}

module.exports = AssetSourceGenerator;
