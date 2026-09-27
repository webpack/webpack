/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../runtime/RuntimeGlobals");
const RuntimeModule = require("../runtime/RuntimeModule");

/** @import Compilation from "../Compilation" */

class ExportBindingRuntimeModule extends RuntimeModule {
	constructor() {
		super("library export bindings");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { runtimeTemplate } = /** @type {Compilation} */ (this.compilation);
		return [
			"var bindings = Object.create(null);",
			`${RuntimeGlobals.exportBinding} = ${runtimeTemplate.basicFunction(
				"id, name, value, subscribe, current",
				[
					"var module = bindings[id];",
					"if(subscribe) {",
					"\tif(!module) module = bindings[id] = Object.create(null);",
					"\t(module[name] || (module[name] = [])).push(value);",
					"} else if(module && module[name]) {",
					"\tvar listeners = module[name];",
					"\tfor(var i = 0; i < listeners.length; i++) listeners[i](current === undefined ? value : current);",
					"}",
					"return value;"
				]
			)};`
		].join("\n");
	}
}

module.exports = ExportBindingRuntimeModule;
