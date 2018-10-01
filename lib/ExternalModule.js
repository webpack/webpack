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

class ExternalModule extends Module {
	constructor(request, type, globalType, userRequest) {
		super("javascript/dynamic", null);

		// Info from Factory
		this.request = request;
		this.externalType = type || globalType;
		this.globalType = globalType;
		this.userRequest = userRequest;
		this.external = true;
	}

	libIdent() {
		return this.userRequest;
	}

	chunkCondition(chunk) {
		return chunk.hasEntryModule();
	}

	identifier() {
		return "external " + JSON.stringify(this.request);
	}

	readableIdentifier() {
		return "external " + JSON.stringify(this.request);
	}

	needRebuild() {
		return false;
	}

	build(options, compilation, resolver, fs, callback) {
		this.built = true;
		this.buildMeta = {};
		this.buildInfo = {};
		callback();
	}

	getSourceForMissingExternal(optional, request) {
		if (optional) {
			return WebpackMissingModule.module(request);
		} else {
			throw new Error(`Cannot find module ${request}`);
		}
	}

	getSourceForUnsupportedAmdExternal(optional, type) {
		const err = `The '${type}' target does not support AMD external dependencies.`;
		if (optional) {
			const errorCode = `var e = new Error(${JSON.stringify(
				err
			)}); e.code = 'MODULE_NOT_FOUND';`;
			return `(function() { ${errorCode} throw e; }());`;
		} else {
			throw new Error(err);
		}
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
		return `module.exports = require(${JSON.stringify(
			moduleName
		)})${objectLookup};`;
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
		if (!Array.isArray(request)) {
			// make it an array as the look up works the same basically
			request = [request];
		}

		const variableName = request[0];
		const missingModuleError = optional
			? this.checkExternalVariable(variableName, request.join("."))
			: "";
		const objectLookup = request
			.slice(1)
			.map(r => `[${JSON.stringify(r)}]`)
			.join("");
		return `${missingModuleError}module.exports = ${variableName}${objectLookup};`;
	}

	getSourceString(runtime) {
		const type = this.externalType;
		let request = this.request;
		if (typeof request === "object" && !Array.isArray(request)) {
			request = /^(amd|umd)/.test(type) ? request.amd : request[type];
		}
		if (!request) {
			return this.getSourceForMissingExternal(this.optional, this.userRequest);
		}
		if (type === "amd" && !/^(amd|umd)/.test(this.globalType)) {
			return this.getSourceForUnsupportedAmdExternal(
				this.optional,
				this.globalType
			);
		}
		switch (type) {
			case "this":
			case "window":
			case "self":
				return this.getSourceForGlobalVariableExternal(request, type);
			case "global":
				return this.getSourceForGlobalVariableExternal(
					runtime.outputOptions.globalObject,
					type
				);
			case "commonjs":
			case "commonjs2":
				return this.getSourceForCommonJsExternal(request);
			case "amd":
			case "amd-require":
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

	source(dependencyTemplates, runtime) {
		return this.getSource(this.getSourceString(runtime));
	}

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
