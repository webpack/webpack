/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Module = require("./Module");
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const WebpackMissingModule = require("./dependencies/WebpackMissingModule");

class ExternalModule extends Module {
	constructor(request, type) {
		super();
		this.chunkCondition = function(chunk) {
			return chunk.hasEntryModule();
		};
		this.request = request;
		this.type = type;
		this.built = false;
		this.external = true;
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
		this.builtTime = new Date().getTime();
		callback();
	}

	getSourceForGlobalVariableExternal(request, type) {
		if(!Array.isArray(request)) {
			return `(function() { module.exports = ${type}[${JSON.stringify(request)}]; }());`;
		}

		// needed for e.g. window["some"]["thing"]
		const objectLookup = request.map(r => `[${JSON.stringify(r)}]`).join("");
		return `(function() { module.exports = ${type}${objectLookup}; }());`;
	}

	getSourceForCommonJsExternal(request) {
		if(!Array.isArray(request)) {
			return `module.exports = require(${JSON.stringify(request)});`;
		}

		const moduleName = request[0];
		const objectLookup = request.slice(1).map(r => `[${JSON.stringify(r)}]`).join("");
		return `module.exports = require(${moduleName})${objectLookup};`;
	}

	checkExternalVariable(variableToCheck, request) {
		return `if(typeof ${variableToCheck} === 'undefined') {${WebpackMissingModule.moduleCode(request)}}`;
	}

	getSourceForAmdOrUmdExternal(request, id, optional) {
		const externalVariable = `__WEBPACK_EXTERNAL_MODULE_${id}__`;
		const missingModuleError = optional ? this.checkExternalVariable(externalVariable, request) : "";
		return `${missingModuleError}
module.exports = ${externalVariable};`;
	}

	getSourceForDefaultCase(request, optional) {
		const missingModuleError = optional ? this.checkExternalVariable(request, request) : "";
		return `${missingModuleError}
module.exports = ${request};`;
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
				return this.getSourceForAmdOrUmdExternal(request, this.id, this.optional);
			default:
				return this.getSourceForDefaultCase(request, this.optional);
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
