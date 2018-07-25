/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { OriginalSource, RawSource } = require("webpack-sources");
const Module = require("./Module");
const WebpackMissingModule = require("./dependencies/WebpackMissingModule");
const Template = require("./Template");

/** @typedef {import("./util/createHash").Hash} Hash */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("webpack-sources").Source} Source */

class ExternalModule extends Module {
	constructor(request, type, userRequest) {
		super("javascript/dynamic", null);

		// Info from Factory
		this.request = request;
		this.externalType = type;
		this.userRequest = userRequest;
		this.external = true;
	}

	libIdent() {
		return this.userRequest;
	}

	/**
	 * @param {Chunk} chunk the chunk which condition should be checked
	 * @returns {boolean} true, if the chunk is ok for the module
	 */
	chunkCondition(chunk) {
		return chunk.hasEntryModule();
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
		this.built = true;
		this.buildMeta = {};
		this.buildInfo = {};
		callback();
	}

	getSourceForGlobalVariableExternal(variableName, type) {
		if (!Array.isArray(variableName)) {
			// make it an array as the look up works the same basically
			variableName = [variableName];
		}

		// needed for e.g. window["some"]["thing"]
		const objectLookup = variableName
			.map(r => `[${JSON.stringify(r)}]`)
			.join("");
		return `(function() { module.exports = ${type}${objectLookup}; }());`;
	}

	getSourceForCommonJsExternal(moduleAndSpecifiers) {
		if (!Array.isArray(moduleAndSpecifiers)) {
			return `module.exports = require(${JSON.stringify(
				moduleAndSpecifiers
			)});`;
		}

		const moduleName = moduleAndSpecifiers[0];
		const objectLookup = moduleAndSpecifiers
			.slice(1)
			.map(r => `[${JSON.stringify(r)}]`)
			.join("");
		return `module.exports = require(${moduleName})${objectLookup};`;
	}

	checkExternalVariable(variableToCheck, request) {
		return `if(typeof ${variableToCheck} === 'undefined') {${WebpackMissingModule.moduleCode(
			request
		)}}\n`;
	}

	getSourceForAmdOrUmdExternal(id, optional, request) {
		const externalVariable = `__WEBPACK_EXTERNAL_MODULE_${Template.toIdentifier(
			`${id}`
		)}__`;
		const missingModuleError = optional
			? this.checkExternalVariable(externalVariable, request)
			: "";
		return `${missingModuleError}module.exports = ${externalVariable};`;
	}

	getSourceForDefaultCase(optional, request) {
		const missingModuleError = optional
			? this.checkExternalVariable(request, request)
			: "";
		return `${missingModuleError}module.exports = ${request};`;
	}

	getSourceString(runtime) {
		const request =
			typeof this.request === "object"
				? this.request[this.externalType]
				: this.request;
		switch (this.externalType) {
			case "this":
			case "window":
			case "self":
				return this.getSourceForGlobalVariableExternal(
					request,
					this.externalType
				);
			case "global":
				return this.getSourceForGlobalVariableExternal(
					runtime.outputOptions.globalObject,
					this.externalType
				);
			case "commonjs":
			case "commonjs2":
				return this.getSourceForCommonJsExternal(request);
			case "amd":
			case "umd":
			case "umd2":
				return this.getSourceForAmdOrUmdExternal(
					this.id,
					this.optional,
					request
				);
			default:
				return this.getSourceForDefaultCase(this.optional, request);
		}
	}

	getSource(sourceString) {
		if (this.useSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		}

		return new RawSource(sourceString);
	}

	/**
	 * @param {DependencyTemplates} dependencyTemplates the dependency templates
	 * @param {RuntimeTemplate} runtimeTemplate the runtime template
	 * @param {string=} type the type of source that should be returned
	 * @returns {Source} generated source
	 */
	source(dependencyTemplates, runtimeTemplate, type) {
		return this.getSource(this.getSourceString(runtimeTemplate));
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		return 42;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @returns {void}
	 */
	updateHash(hash) {
		hash.update(this.externalType);
		hash.update(JSON.stringify(this.request));
		hash.update(JSON.stringify(Boolean(this.optional)));
		super.updateHash(hash);
	}
}

module.exports = ExternalModule;
