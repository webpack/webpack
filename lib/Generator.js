/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { JAVASCRIPT_TYPE } = require("./ModuleSourceTypeConstants");
const memoize = require("./util/memoize");

/** @import { Source } from "webpack-sources" */
/** @import ChunkGraph from "./ChunkGraph" */
/** @import CodeGenerationResults from "./CodeGenerationResults" */
/** @import ConcatenationScope from "./ConcatenationScope" */
/** @import DependencyTemplates from "./DependencyTemplates" */
/**
 * @import {
 * 	CodeGenerationResultData,
 * 	ConcatenationBailoutReasonContext,
 * 	RuntimeRequirements,
 * 	SourceType,
 * 	SourceTypes
 * } from "./Module"
 */
/** @import ModuleGraph from "./ModuleGraph" */
/** @import NormalModule from "./NormalModule" */
/** @import RuntimeTemplate from "./RuntimeTemplate" */
/** @import Hash from "./util/Hash" */
/** @import { RuntimeSpec } from "./util/runtime" */

/**
 * Defines the generate context type used by this module.
 * @typedef {object} GenerateContext
 * @property {DependencyTemplates} dependencyTemplates mapping from dependencies to templates
 * @property {RuntimeTemplate} runtimeTemplate the runtime template
 * @property {ModuleGraph} moduleGraph the module graph
 * @property {ChunkGraph} chunkGraph the chunk graph
 * @property {RuntimeRequirements} runtimeRequirements the requirements for runtime
 * @property {RuntimeSpec} runtime the runtime
 * @property {ConcatenationScope=} concatenationScope when in concatenated module, information about other concatenated modules
 * @property {CodeGenerationResults=} codeGenerationResults code generation results of other modules (need to have a codeGenerationDependency to use that)
 * @property {SourceType} type which kind of code should be generated
 * @property {() => CodeGenerationResultData=} getData get access to the code generation data
 */

/**
 * Defines the generate error fn callback.
 * @callback GenerateErrorFn
 * @param {Error} error the error
 * @param {NormalModule} module module for which the code should be generated
 * @param {GenerateContext} generateContext context for generate
 * @returns {Source | null} generated code
 */

/**
 * Represents the generator runtime component.
 * @typedef {object} UpdateHashContext
 * @property {NormalModule} module the module
 * @property {ChunkGraph} chunkGraph
 * @property {RuntimeSpec} runtime
 * @property {RuntimeTemplate=} runtimeTemplate
 */

const getModuleParseError = memoize(() => require("./errors/ModuleParseError"));

class Generator {
	/**
	 * Returns generator by type.
	 * @param {{ [key in SourceType]?: Generator }} map map of types
	 * @returns {ByTypeGenerator} generator by type
	 */
	static byType(map) {
		return new ByTypeGenerator(map);
	}

	/**
	 * Returns the statement a module that failed to build throws when executed.
	 * @param {Error} error the build error
	 * @param {string=} parseErrorConstructor constructor for a rejected source, defaults to `SyntaxError` (WebAssembly rejects with `WebAssembly.CompileError` instead)
	 * @returns {string} javascript statement
	 */
	static throwBuildErrorCode(error, parseErrorConstructor = "SyntaxError") {
		// A source the parser rejected throws what a native load of it would.
		const name =
			error instanceof getModuleParseError() ? parseErrorConstructor : "Error";

		return `throw new ${name}(${JSON.stringify(error.message)});`;
	}

	/* istanbul ignore next */
	/**
	 * Returns the source types available for this module.
	 * @abstract
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		const AbstractMethodError = require("./errors/AbstractMethodError");

		throw new AbstractMethodError();
	}

	/**
	 * @returns {boolean} whether getTypes() depends on the module's incoming connections
	 */
	getTypesDependOnIncomingConnections() {
		return false;
	}

	/* istanbul ignore next */
	/**
	 * Returns the estimated size for the requested source type.
	 * @abstract
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		const AbstractMethodError = require("./errors/AbstractMethodError");

		throw new AbstractMethodError();
	}

	/* istanbul ignore next */
	/**
	 * Generates generated code for this runtime module.
	 * @abstract
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(
		module,
		{ dependencyTemplates, runtimeTemplate, moduleGraph, type }
	) {
		const AbstractMethodError = require("./errors/AbstractMethodError");

		throw new AbstractMethodError();
	}

	/**
	 * Returns the reason this module cannot be concatenated, when one exists.
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		return `Module Concatenation is not implemented for ${this.constructor.name}`;
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module, runtime }) {
		// no nothing
	}
}

/**
 * @this {ByTypeGenerator}
 * @type {GenerateErrorFn}
 */
function generateError(error, module, generateContext) {
	const type = generateContext.type;
	const generator =
		/** @type {Generator & { generateError?: GenerateErrorFn }} */
		(this.map[type]);
	if (!generator) {
		throw new Error(`Generator.byType: no generator specified for ${type}`);
	}
	if (typeof generator.generateError === "undefined") {
		return null;
	}
	return generator.generateError(error, module, generateContext);
}

class ByTypeGenerator extends Generator {
	/**
	 * Creates an instance of ByTypeGenerator.
	 * @param {{ [key in SourceType]?: Generator }} map map of types
	 */
	constructor(map) {
		super();
		this.map = map;
		/** @type {SourceTypes} */
		this._types = /** @type {SourceTypes} */ (new Set(Object.keys(map)));
		/** @type {GenerateErrorFn | undefined} */
		this.generateError = generateError.bind(this);
	}

	/**
	 * Returns the source types available for this module.
	 * @param {NormalModule} module fresh module
	 * @returns {SourceTypes} available types (do not mutate)
	 */
	getTypes(module) {
		return this._types;
	}

	/**
	 * Returns the estimated size for the requested source type.
	 * @param {NormalModule} module the module
	 * @param {SourceType=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type = JAVASCRIPT_TYPE) {
		const t = type;
		const generator = this.map[t];
		return generator ? generator.getSize(module, t) : 0;
	}

	/**
	 * Generates generated code for this runtime module.
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source | null} generated code
	 */
	generate(module, generateContext) {
		const type = generateContext.type;
		const generator = this.map[type];
		if (!generator) {
			throw new Error(`Generator.byType: no generator specified for ${type}`);
		}
		return generator.generate(module, generateContext);
	}
}

module.exports = Generator;
