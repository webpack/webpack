/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../module/Generator");
const { WEBASSEMBLY_TYPES } = require("../module/ModuleSourceTypeConstants");

/** @import { Source } from "webpack-sources" */
/** @import { GenerateContext } from "../module/Generator" */
/** @import { SourceType, SourceTypes } from "../module/Module" */
/** @import NormalModule from "../module/NormalModule" */

/**
 * Represents the async web assembly generator runtime component.
 * @typedef {object} AsyncWebAssemblyGeneratorOptions
 * @property {boolean=} mangleImports mangle imports
 */

/**
 * The module type the JSDoc inherited from `Generator` names.
 * @typedef {NormalModule} TModule
 */

/**
 * @extends {Generator<TModule>}
 */
class AsyncWebAssemblyGenerator extends Generator {
	/**
	 * Creates an instance of AsyncWebAssemblyGenerator.
	 * @param {AsyncWebAssemblyGeneratorOptions} options options
	 */
	constructor(options) {
		super();
		/** @type {AsyncWebAssemblyGeneratorOptions} */
		this.options = options;
	}

	/**
	 * Returns whether the module's source is kept as a `Buffer` rather than a string, the way loaders hand it over.
	 * `undefined` leaves it to the module: a `binary` generator option, else whether the type is under `asset` or `webassembly`.
	 * @param {TModule} module the module
	 * @returns {boolean | undefined} whether the source is binary, or `undefined` to leave it to the module
	 */
	isBinary(module) {
		return true;
	}

	/**
	 * Returns the source types available for this module.
	 * @param {TModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return WEBASSEMBLY_TYPES;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {TModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const originalSource = module.originalSource();
		if (!originalSource) {
			return 0;
		}
		return originalSource.size();
	}

	/**
	 * Generates generated code for this runtime module.
	 * @param {TModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		return /** @type {Source} */ (module.originalSource());
	}

	/**
	 * Generates fallback output for the provided error condition.
	 * @param {Error} error the error
	 * @param {TModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generateError(error, module, generateContext) {
		return new RawSource(
			Generator.buildErrorMessage(
				error,
				generateContext.runtimeTemplate.requestShortener
			)
		);
	}
}

module.exports = AsyncWebAssemblyGenerator;
