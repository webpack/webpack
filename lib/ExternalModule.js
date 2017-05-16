/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Module = require("./Module");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const WebpackMissingModule = require("./dependencies/WebpackMissingModule");
const Template = require("./Template");

class ExternalModule extends Module {
	constructor(request, type) {
		super();
		this.request = request;
		this.type = type;
		this.built = false;
		this.external = true;
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
		this.builtTime = Date.now();
		callback();
	}

	getSourceForGlobalVariableExternal(variableName, type) {
		if(!Array.isArray(variableName)) {
			// make it an array as the look up works the same basically
			variableName = [variableName];
		}

		// needed for e.g. window["some"]["thing"]
		const objectLookup = variableName.map(r => `[${JSON.stringify(r)}]`).join("");
		return `(function() { module.exports = ${type}${objectLookup}; }());`;
	}

	getSourceForCommonJsExternal(moduleAndSpecifiers) {
		if(!Array.isArray(moduleAndSpecifiers)) {
			return `module.exports = require(${JSON.stringify(moduleAndSpecifiers)});`;
		}

		const moduleName = moduleAndSpecifiers[0];
		const objectLookup = moduleAndSpecifiers.slice(1).map(r => `[${JSON.stringify(r)}]`).join("");
		return `module.exports = require(${moduleName})${objectLookup};`;
	}

	checkExternalVariable(variableToCheck, request) {
		return `if(typeof ${variableToCheck} === 'undefined') {${WebpackMissingModule.moduleCode(request)}}\n`;
	}

	getSourceForAmdOrUmdExternal(id, optional, request) {
		const externalVariable = Template.toIdentifier(`__WEBPACK_EXTERNAL_MODULE_${id}__`);
		const missingModuleError = optional ? this.checkExternalVariable(externalVariable, request) : "";
		return `${missingModuleError}module.exports = ${externalVariable};`;
	}

	getSourceForDefaultCase(optional, request) {
		const missingModuleError = optional ? this.checkExternalVariable(request, request) : "";
		return `${missingModuleError}module.exports = ${request};`;
	}

	getSourceString() {
		const request = typeof this.request === "object" ? this.request[this.type] : this.request;
		switch(this.type) {
			case "this":
			case "window":
			case "global":
				return this.getSourceForGlobalVariableExternal(request, this.type);
			case "commonjs":
			case "commonjs2":
				return this.getSourceForCommonJsExternal(request);
			case "amd":
			case "umd":
			case "umd2":
				return this.getSourceForAmdOrUmdExternal(this.id, this.optional, request);
			default:
				return this.getSourceForDefaultCase(this.optional, request);
		}
	}

	getSource(sourceString) {
		if(this.useSourceMap) {
			return new OriginalSource(sourceString, this.identifier());
		}

		return new RawSource(sourceString);
	}

	source() {
		return this.getSource(
			this.getSourceString()
		);
	}

	size() {
		return 42;
	}
}

module.exports = ExternalModule;
