/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

/** @import Compilation from "../Compilation" */

class MergeExportsRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("merge exports");
	}

	/**
	 * Returns true, if the runtime module should get it's own scope.
	 * When false, `generate()` must emit complete statements ending with `;`
	 * so a following runtime IIFE is not parsed as a call (ASI).
	 * @returns {boolean} true, if the runtime module should get it's own scope
	 */
	shouldIsolate() {
		return false;
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const fn = RuntimeGlobals.mergeExports;
		const cst = runtimeTemplate.renderConst();
		return Template.asString([
			"// merge the exports of several entry modules into one object",
			`${fn} = ${runtimeTemplate.basicFunction("namespaces", [
				`${cst} merged = {};`,
				`${runtimeTemplate.renderLet()} esModule = false;`,
				"for (var i = 0; i < namespaces.length; i++) {",
				Template.indent([
					`${cst} ns = namespaces[i];`,
					"if (!ns) continue;",
					"if (ns.__esModule) esModule = true;",
					// Copying the descriptor keeps a live binding live, and only a
					// re-flagged one can overwrite a namespace's own non-configurable.
					`${cst} keys = Object.keys(ns);`,
					"for (var j = 0; j < keys.length; j++) {",
					Template.indent([
						`${cst} descriptor = Object.getOwnPropertyDescriptor(ns, keys[j]);`,
						"descriptor.configurable = true;",
						"Object.defineProperty(merged, keys[j], descriptor);"
					]),
					"}"
				]),
				"}",
				`if (esModule) ${RuntimeGlobals.makeNamespaceObject}(merged);`,
				"return merged;"
			])};`
		]);
	}
}

module.exports = MergeExportsRuntimeModule;
