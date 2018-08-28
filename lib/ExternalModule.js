/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const Module = require("./Module");
const Template = require("./Template");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/createHash").Hash} Hash */

/**
 * @param {string|string[]} variableName the variable name or path
 * @param {string} type the module system
 * @returns {string} the generated source
 */
const getSourceForGlobalVariableExternal = (variableName, type) => {
	if (!Array.isArray(variableName)) {
		// make it an array as the look up works the same basically
		variableName = [variableName];
	}

	// needed for e.g. window["some"]["thing"]
	const objectLookup = variableName.map(r => `[${JSON.stringify(r)}]`).join("");
	return `(function() { module.exports = ${type}${objectLookup}; }());`;
};

/**
 * @param {string|string[]} moduleAndSpecifiers the module request
 * @returns {string} the generated source
 */
const getSourceForCommonJsExternal = moduleAndSpecifiers => {
	if (!Array.isArray(moduleAndSpecifiers)) {
		return `module.exports = require(${JSON.stringify(moduleAndSpecifiers)});`;
	}
	const moduleName = moduleAndSpecifiers[0];
	const objectLookup = moduleAndSpecifiers
		.slice(1)
		.map(r => `[${JSON.stringify(r)}]`)
		.join("");
	return `module.exports = require(${moduleName})${objectLookup};`;
};

/**
 * @param {string} variableName the variable name to check
 * @param {string} request the request path
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {string} the generated source
 */
const checkExternalVariable = (variableName, request, runtimeTemplate) => {
	return `if(typeof ${variableName} === 'undefined') { ${runtimeTemplate.throwMissingModuleErrorBlock(
		{ request }
	)} }\n`;
};

/**
 * @param {string|number} id the module id
 * @param {boolean} optional true, if the module is optional
 * @param {string} request the request path
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {string} the generated source
 */
const getSourceForAmdOrUmdExternal = (
	id,
	optional,
	request,
	runtimeTemplate
) => {
	const externalVariable = `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
		`${id}`
	)}__`;
	const missingModuleError = optional
		? checkExternalVariable(externalVariable, request, runtimeTemplate)
		: "";
	return `${missingModuleError}module.exports = ${externalVariable};`;
};

/**
 * @param {boolean} optional true, if the module is optional
 * @param {string} request the request path
 * @param {RuntimeTemplate} runtimeTemplate the runtime template
 * @returns {string} the generated source
 */
const getSourceForDefaultCase = (optional, request, runtimeTemplate) => {
	const missingModuleError = optional
		? checkExternalVariable(request, request, runtimeTemplate)
		: "";
	return `${missingModuleError}module.exports = ${request};`;
};

class ExternalModule extends Module {
	constructor(request, type, userRequest) {
		super("javascript/dynamic", null);

		// Info from Factory
		/** @type {string | string[] | Record<string, string | string[]>} */
		this.request = request;
		/** @type {string} */
		this.externalType = type;
		/** @type {string} */
		this.userRequest = userRequest;
		/** @type {boolean} */
		this.external = true;
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return this.userRequest;
	}

	/**
	 * @param {Chunk} chunk the chunk which condition should be checked
	 * @param {Compilation} compilation the compilation
	 * @returns {boolean} true, if the chunk is ok for the module
	 */
	chunkCondition(chunk, { chunkGraph }) {
		return chunkGraph.getNumberOfEntryModules(chunk) > 0;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return "external " + JSON.stringify(this.request);
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return "external " + JSON.stringify(this.request);
	}

	/**
	 * @param {TODO} fileTimestamps timestamps of files
	 * @param {TODO} contextTimestamps timestamps of directories
	 * @returns {boolean} true, if the module needs a rebuild
	 */
	needRebuild(fileTimestamps, contextTimestamps) {
		return false;
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(Error=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this.buildMeta = {};
		this.buildInfo = {};
		callback();
	}

	getSourceString(runtimeTemplate, moduleGraph, chunkGraph) {
		const request =
			typeof this.request === "object"
				? this.request[this.externalType]
				: this.request;
		switch (this.externalType) {
			case "this":
			case "window":
			case "self":
				return getSourceForGlobalVariableExternal(request, this.externalType);
			case "global":
				return getSourceForGlobalVariableExternal(
					runtimeTemplate.outputOptions.globalObject,
					this.externalType
				);
			case "commonjs":
			case "commonjs2":
				return getSourceForCommonJsExternal(request);
			case "amd":
			case "umd":
			case "umd2":
				return getSourceForAmdOrUmdExternal(
					chunkGraph.getModuleId(this),
					this.isOptional(moduleGraph),
					request,
					runtimeTemplate
				);
			default:
				return getSourceForDefaultCase(
					this.isOptional(moduleGraph),
					request,
					runtimeTemplate
				);
		}
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source({ runtimeTemplate, moduleGraph, chunkGraph }) {
		const sourceString = this.getSourceString(
			runtimeTemplate,
			moduleGraph,
			chunkGraph
		);
		if (this.useSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		} else {
			return new RawSource(sourceString);
		}
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		return 42;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(this.externalType);
		hash.update(JSON.stringify(this.request));
		hash.update(
			JSON.stringify(Boolean(this.isOptional(chunkGraph.moduleGraph)))
		);
		super.updateHash(hash, chunkGraph);
	}
}

module.exports = ExternalModule;
