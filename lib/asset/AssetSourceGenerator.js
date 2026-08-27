/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const { RawSource } = require("webpack-sources");
const ConcatenationScope = require("../ConcatenationScope");
const Generator = require("../Generator");
const {
	ASSET_URL_TYPE,
	ASSET_URL_TYPES,
	CSS_TYPE,
	HTML_TYPE,
	JAVASCRIPT_AND_ASSET_URL_TYPES,
	JAVASCRIPT_TYPE,
	JAVASCRIPT_TYPES,
	NO_TYPES
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const { languageOfFilename } = require("../util/dataURL");

/** @import { Source } from "webpack-sources" */
/** @import { GenerateContext, UpdateHashContext } from "../Generator" */
/** @import Hash from "../util/Hash" */
/**
 * @import {
 * 	ConcatenationBailoutReasonContext,
 * 	SourceType,
 * 	SourceTypes
 * } from "../Module"
 */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import NormalModule from "../NormalModule" */

class AssetSourceGenerator extends Generator {
	/**
	 * Creates an instance of AssetSourceGenerator.
	 * @param {ModuleGraph} moduleGraph the module graph
	 */
	constructor(moduleGraph) {
		super();

		/** @type {ModuleGraph} */
		this._moduleGraph = moduleGraph;
	}

	/**
	 * Generates generated code for this runtime module.
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
				const encodedSource = AssetSourceGenerator._renderEmbedded(
					module,
					typeof content === "string" ? content : content.toString("utf8"),
					runtimeTemplate
				);

				/** @type {string} */
				let sourceContent;
				if (concatenationScope) {
					concatenationScope.registerNamespaceExport(
						ConcatenationScope.NAMESPACE_OBJECT_EXPORT
					);
					sourceContent = `${runtimeTemplate.renderConst()} ${
						ConcatenationScope.NAMESPACE_OBJECT_EXPORT
					} = ${JSON.stringify(encodedSource)};`;
				} else {
					runtimeRequirements.add(RuntimeGlobals.module);
					sourceContent = `${module.moduleArgument}.exports = ${JSON.stringify(
						encodedSource
					)};`;
				}
				return new RawSource(sourceContent);
			}
			case ASSET_URL_TYPE: {
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
	 * Offer the file's text to `renderEmbeddedSource` before it is embedded in
	 * JavaScript. Declines a file whose name names no language webpack knows.
	 * @param {NormalModule} module the module holding the text
	 * @param {string} text the file's text
	 * @param {GenerateContext["runtimeTemplate"]} runtimeTemplate runtime template
	 * @returns {string} the rendered text, or `text` when nothing rendered it
	 */
	static _renderEmbedded(module, text, runtimeTemplate) {
		if (!runtimeTemplate) return text;
		// Untapped, nothing can change: no mime lookup and no source to wrap.
		const { compilation } = runtimeTemplate;
		if (compilation.hooks.renderEmbeddedSource.taps.length === 0) return text;
		const type = languageOfFilename(module.nameForCondition());
		if (type === undefined) return text;
		const rendered = compilation._resolveEmbeddedSource(new RawSource(text), {
			type,
			hostType: JAVASCRIPT_TYPE,
			module
		});
		return /** @type {string} */ (rendered.source());
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, updateHashContext) {
		const { module, runtimeTemplate } = updateHashContext;
		// What a tap varies on has to reach the key, or a changed option replays.
		if (
			runtimeTemplate &&
			runtimeTemplate.compilation.hooks.renderEmbeddedSource.taps.length > 0 &&
			languageOfFilename(module.nameForCondition())
		) {
			runtimeTemplate.compilation.hooks.embeddedSourceHash.call(module, hash);
		}
	}

	/**
	 * Generates fallback output for the provided error condition.
	 * @param {Error} error the error
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generateError(error, module, generateContext) {
		switch (generateContext.type) {
			case JAVASCRIPT_TYPE: {
				return new RawSource(Generator.throwBuildErrorCode(error));
			}
			default:
				return null;
		}
	}

	/**
	 * Returns the reason this module cannot be concatenated, when one exists.
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		return undefined;
	}

	/**
	 * Returns the source types available for this module.
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
			if (
				sourceTypes.has(JAVASCRIPT_TYPE) &&
				(sourceTypes.has(CSS_TYPE) || sourceTypes.has(HTML_TYPE))
			) {
				return JAVASCRIPT_AND_ASSET_URL_TYPES;
			} else if (sourceTypes.has(CSS_TYPE) || sourceTypes.has(HTML_TYPE)) {
				return ASSET_URL_TYPES;
			}
			return JAVASCRIPT_TYPES;
		}

		return NO_TYPES;
	}

	/**
	 * @returns {boolean} whether getTypes() depends on the module's incoming connections
	 */
	getTypesDependOnIncomingConnections() {
		return true;
	}

	/**
	 * Returns the estimated size for the requested source type.
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
