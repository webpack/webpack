/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

import * as RuntimeGlobals from "../RuntimeGlobals.js";
import Template from "../Template.js";
import HelperRuntimeModule from "./HelperRuntimeModule.js";
/** @typedef {import("../Compilation.js").default} Compilation */

class CreateScriptUrlRuntimeModule extends HelperRuntimeModule {
	constructor() {
		super("trusted types script url");
	}

	/**
	 * Generates runtime code for this runtime module.
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const { runtimeTemplate, outputOptions } = compilation;
		const { trustedTypes } = outputOptions;
		const fn = RuntimeGlobals.createScriptUrl;

		return Template.asString(
			`${fn} = ${runtimeTemplate.returningFunction(
				trustedTypes
					? `${RuntimeGlobals.getTrustedTypesPolicy}().createScriptURL(url)`
					: "url",
				"url"
			)};`
		);
	}
}

export default CreateScriptUrlRuntimeModule;

export { CreateScriptUrlRuntimeModule as "module.exports" };
