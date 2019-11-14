/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const HelperRuntimeModule = require("./HelperRuntimeModule");

class CreateFakeNamespaceObjectRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("create fake namespace object");
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { runtimeTemplate } = this.compilation;
		const modern =
			runtimeTemplate.supportsArrowFunction() &&
			runtimeTemplate.supportsConst();
		const fn = RuntimeGlobals.createFakeNamespaceObject;
		return Template.asString([
			"// create a fake namespace object",
			"// mode & 1: value is a module id, require it",
			"// mode & 2: merge all properties of value into the ns",
			"// mode & 4: return value when already ns object",
			"// mode & 8|1: behave like require",
			// Note: must be a function (not arrow), because this is used in body!
			`${fn} = function(value, mode) {`,
			Template.indent([
				`if(mode & 1) value = this(value);`,
				`if(mode & 8) return value;`,
				"if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;",
				"var ns = Object.create(null);",
				`${RuntimeGlobals.makeNamespaceObject}(ns);`,
				"var def = {};",
				"if(mode & 2 && typeof value == 'object' && value) {",
				Template.indent([
					modern
						? `for(const key in value) def[key] = () => value[key];`
						: `for(var key in value) def[key] = function(key) { return value[key]; }.bind(null, key);`
				]),
				"}",
				modern
					? "def['default'] = () => value;"
					: "def['default'] = function() { return value; };",
				`${RuntimeGlobals.definePropertyGetters}(ns, def);`,
				"return ns;"
			]),
			"};"
		]);
	}
}

module.exports = CreateFakeNamespaceObjectRuntimeModule;
