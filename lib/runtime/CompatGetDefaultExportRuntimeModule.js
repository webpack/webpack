/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class CompatGetDefaultExportRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("compat get default export");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const fn = RuntimeGlobals.compatGetDefaultExport;
		return Template.asString([
			"// getDefaultExport function for compatibility with non-harmony modules",
			`${fn} = function(module) {`,
			Template.indent([
				"var getter = module && module.__esModule ?",
				Template.indent([
					"function getDefault() { return module['default']; } :",
					"function getModuleExports() { return module; };"
				]),
				`${RuntimeGlobals.definePropertyGetter}(getter, 'a', getter);`,
				"return getter;"
			]),
			"};"
		]);
	}
}

module.exports = CompatGetDefaultExportRuntimeModule;
