/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import HelperRuntimeModule from "./HelperRuntimeModule.js";
/** @typedef {import("../Compilation.js").default} Compilation */

class RelativeUrlRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("relative url");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate } = compilation;
		const cst = runtimeTemplate.renderConst();
		return Template.asString([
			`${RuntimeGlobals.relativeUrl} = function RelativeURL(url) {`,
			Template.indent([
				`${cst} realUrl = new URL(url, "x:/");`,
				`${cst} values = {};`,
				"for (var key in realUrl) values[key] = realUrl[key];",
				"values.href = url;",
				'values.pathname = url.replace(/[?#].*/, "");',
				'values.origin = values.protocol = "";',
				`values.toString = values.toJSON = ${runtimeTemplate.returningFunction(
					"url"
				)};`,
				"for (var key in values) Object.defineProperty(this, key, { enumerable: true, configurable: true, value: values[key] });"
			]),
			"};",
			`${RuntimeGlobals.relativeUrl}.prototype = URL.prototype;`
		]);
	}
}

export default RelativeUrlRuntimeModule;

export { RelativeUrlRuntimeModule as "module.exports" };
