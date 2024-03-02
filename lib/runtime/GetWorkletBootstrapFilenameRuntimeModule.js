/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Daniel Kuschny @danielku15
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/**
 * This runtime module injects the RuntimeGlobals.getWorkletBootstrapFilename code
 * Via this function we ensure that we only have a single inline blob object URL
 * instead of creating a new one for every worklet. This way we prevent dangling/leaks
 * on those scripts.
 */
class GetWorkletBootstrapFilenameRuntimeModule extends RuntimeModule {
	/**
	 * @param {string} global function name to be assigned
	 */
	constructor(global) {
		super(`get worklet bootstrap filename`);
		this.global = global;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		// we go with the assumption that the RuntimeGlobals.baseURI might change
		// so we generate one blob URL for each base URI whenever requested an missing
		return Template.asString([
			"// This function holds the global bootstrapping script for worklets",
			`${this.global} = (() => {`,
			Template.indent([
				"const _scripts = new Map();",
				"return () => {",
				Template.indent([
					`if (!_scripts.has(${RuntimeGlobals.baseURI})) {`,
					Template.indent([
						"const scriptLines = [",
						Template.indent([
							// worklet global scopes have no 'self', we need to inject it for compatibility with the normal chunk inclusion
							// this might not be needed anymore in future if webpack registers chunks into globalThis instead of self.
							`'globalThis.self = globalThis.self || globalThis;',`,
							// some plugins like the auto public path need a location set. but the worklet scopes don't have a location
							// so we pass this on from the main runtime
							`\`globalThis.location = \${JSON.stringify(${RuntimeGlobals.baseURI})}\`,`,
							// we reuse the importScripts chunk loader from WebWorkers but throw an error during runtime for dynamically loaded chunks
							// as there is no way of dynamically loading files in worklets.
							// importScripts is also checked in some plugins like the auto public path.
							`'globalThis.importScripts = (url) => { throw new Error("importScripts not available, dynamic loading of chunks not supported in this context", url) };',`
						]),
						"];",
						`_scripts.set(${RuntimeGlobals.baseURI}, URL.createObjectURL(new Blob([scriptLines.join('\\n')], { type: "application/javascript" })))`
					]),
					"}",
					`return _scripts.get(${RuntimeGlobals.baseURI});`
				]),
				"};"
			]),
			"})();"
		]);
	}
}

module.exports = GetWorkletBootstrapFilenameRuntimeModule;
